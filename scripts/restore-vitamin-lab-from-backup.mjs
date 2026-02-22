#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function parseDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, 'utf8');
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

function loadEnv(cwd) {
  const fromFile = {
    ...parseDotEnv(path.join(cwd, '.env')),
    ...parseDotEnv(path.join(cwd, '.env.local'))
  };
  return {
    baseUrl: process.env.VITE_BASE44_SERVER_URL || fromFile.VITE_BASE44_SERVER_URL || 'https://base44.app',
    appId: process.env.VITE_BASE44_APP_ID || fromFile.VITE_BASE44_APP_ID || '6926c8ba462c334e960f2a2c',
    token: process.env.VITE_BASE44_ACCESS_TOKEN || fromFile.VITE_BASE44_ACCESS_TOKEN || '',
    fnVersion: process.env.VITE_BASE44_FUNCTIONS_VERSION || fromFile.VITE_BASE44_FUNCTIONS_VERSION || ''
  };
}

function headers(env) {
  const h = { 'Content-Type': 'application/json', 'X-App-Id': env.appId };
  if (env.token) h.Authorization = `Bearer ${env.token}`;
  if (env.fnVersion) h['Base44-Functions-Version'] = env.fnVersion;
  return h;
}

function looksLikeHtml(value) {
  return /<\/?[a-z][^>]*>/i.test(value);
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toPlainText(value) {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function appendRawUnique(sections, value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return;
  const normalized = toPlainText(trimmed);
  const existing = toPlainText(sections.join('\n\n'));
  if (normalized && existing.includes(normalized)) return;
  sections.push(looksLikeHtml(trimmed) ? trimmed : escapeHtml(trimmed).replace(/\n/g, '<br>'));
}

function appendLabeledUnique(sections, label, value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return;
  const normalized = toPlainText(trimmed);
  const existing = toPlainText(sections.join('\n\n'));
  if (normalized && existing.includes(normalized)) return;
  if (looksLikeHtml(trimmed)) {
    sections.push(`<p><strong>${escapeHtml(label)}:</strong></p>${trimmed}`);
    return;
  }
  sections.push(`<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(trimmed)}</p>`);
}

function mergeRecord(record) {
  const sections = [];
  appendRawUnique(sections, record.labTestDeficiencyDetails);
  appendRawUnique(sections, record.labTestDeficiency);
  appendLabeledUnique(sections, 'תיאור החוסר', record.labTestDeficiencyDescription);
  return sections.join('<br><br>').trim();
}

async function updateVitamin(env, id, payload) {
  const url = `${env.baseUrl.replace(/\/$/, '')}/api/apps/${env.appId}/entities/Vitamin/${encodeURIComponent(id)}`;
  const response = await fetch(url, { method: 'PUT', headers: headers(env), body: JSON.stringify(payload) });
  const contentType = response.headers.get('content-type') || '';
  const payloadRes = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    throw new Error(typeof payloadRes === 'object' && payloadRes && 'message' in payloadRes ? payloadRes.message : `HTTP ${response.status}`);
  }
  return payloadRes;
}

async function main() {
  const cwd = process.cwd();
  const env = loadEnv(cwd);
  const inputPathArg = process.argv[2];
  const inputPath = inputPathArg || path.join(cwd, 'logs', 'migrations', 'vitamin_before_20260222_113032.json');

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Backup file not found: ${inputPath}`);
  }

  const list = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  if (!Array.isArray(list)) {
    throw new Error('Backup file must contain an array');
  }

  let planned = 0;
  let updated = 0;
  const failures = [];

  for (const record of list) {
    const hadLegacy = String(record.labTestDeficiencyDescription || '').trim() || String(record.labTestDeficiencyDetails || '').trim();
    if (!hadLegacy) continue;
    planned += 1;

    const merged = mergeRecord(record);
    try {
      await updateVitamin(env, record.id, {
        labTestDeficiency: undefined,
        labTestDeficiencyDescription: '',
        labTestDeficiencyDetails: merged
      });
      updated += 1;
    } catch (error) {
      failures.push({ id: record.id, vitaminNameHe: record.vitaminNameHe, error: error instanceof Error ? error.message : String(error) });
    }
  }

  const out = {
    backup: inputPath,
    planned,
    updated,
    failed: failures.length,
    failures,
    finishedAt: new Date().toISOString()
  };

  const outPath = path.join(cwd, 'logs', 'migrations', `vitamin_restore_report_${Date.now()}.json`);
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));

  console.log(`planned=${planned}`);
  console.log(`updated=${updated}`);
  console.log(`failed=${failures.length}`);
  console.log(`report=${outPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
