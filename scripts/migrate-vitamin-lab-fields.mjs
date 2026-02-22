#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const DEFAULTS = {
  VITE_BASE44_SERVER_URL: 'https://base44.app',
  VITE_BASE44_APP_ID: '6926c8ba462c334e960f2a2c',
  VITE_BASE44_FUNCTIONS_VERSION: '',
  VITE_BASE44_ACCESS_TOKEN: ''
};

function nowStamp() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${y}${m}${day}_${hh}${mm}${ss}`;
}

function parseDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, 'utf8');
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function loadEnv(cwd) {
  const fromFile = {
    ...parseDotEnv(path.join(cwd, '.env')),
    ...parseDotEnv(path.join(cwd, '.env.local'))
  };
  return {
    VITE_BASE44_SERVER_URL:
      process.env.VITE_BASE44_SERVER_URL || fromFile.VITE_BASE44_SERVER_URL || DEFAULTS.VITE_BASE44_SERVER_URL,
    VITE_BASE44_APP_ID: process.env.VITE_BASE44_APP_ID || fromFile.VITE_BASE44_APP_ID || DEFAULTS.VITE_BASE44_APP_ID,
    VITE_BASE44_FUNCTIONS_VERSION:
      process.env.VITE_BASE44_FUNCTIONS_VERSION || fromFile.VITE_BASE44_FUNCTIONS_VERSION || DEFAULTS.VITE_BASE44_FUNCTIONS_VERSION,
    VITE_BASE44_ACCESS_TOKEN:
      process.env.VITE_BASE44_ACCESS_TOKEN || fromFile.VITE_BASE44_ACCESS_TOKEN || DEFAULTS.VITE_BASE44_ACCESS_TOKEN
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    .replace(/\r\n/g, '\n')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeForCompare(value) {
  return toPlainText(value)
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function appendMissingSection(sections, baseCompare, label, rawValue) {
  const value = (rawValue || '').trim();
  if (!value) return;

  const valueCompare = normalizeForCompare(value);
  const withLabelCompare = normalizeForCompare(`${label}: ${value}`);
  const currentCompare = normalizeForCompare(sections.join('\n\n'));

  if (
    (valueCompare && (baseCompare.includes(valueCompare) || currentCompare.includes(valueCompare))) ||
    (withLabelCompare && (baseCompare.includes(withLabelCompare) || currentCompare.includes(withLabelCompare)))
  ) {
    return;
  }

  if (looksLikeHtml(value)) {
    sections.push(`<p><strong>${escapeHtml(label)}:</strong></p>${value}`);
    return;
  }

  sections.push(`<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`);
}

function appendRawSection(sections, rawValue) {
  const value = (rawValue || '').trim();
  if (!value) return;

  const valueCompare = normalizeForCompare(value);
  const currentCompare = normalizeForCompare(sections.join('\n\n'));
  if (valueCompare && currentCompare.includes(valueCompare)) return;

  sections.push(looksLikeHtml(value) ? value : escapeHtml(value).replace(/\n/g, '<br>'));
}

function mergeLabDeficiencyFields(vitamin) {
  const sections = [];
  appendRawSection(sections, vitamin.labTestDeficiencyDetails);
  appendRawSection(sections, vitamin.labTestDeficiency);
  const baseCompare = normalizeForCompare(sections.join('\n\n'));
  appendMissingSection(sections, baseCompare, 'תיאור החוסר', vitamin.labTestDeficiencyDescription);

  return sections.join('<br><br>').trim();
}

function hasText(value) {
  return String(value || '').trim().length > 0;
}

async function requestWithRetry(url, options, maxAttempts = 7) {
  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, options);
      const contentType = response.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      const payload = isJson ? await response.json() : await response.text();

      if (response.ok) {
        return payload;
      }

      const error = new Error(
        typeof payload === 'object' && payload && 'message' in payload ? payload.message : `HTTP ${response.status}`
      );
      error.status = response.status;
      error.payload = payload;

      if (response.status === 429 || response.status >= 500) {
        const retryAfter = Number(response.headers.get('Retry-After') || 0);
        const waitMs = retryAfter > 0 ? retryAfter * 1000 : Math.min(2000 * attempt, 15000);
        await sleep(waitMs);
        lastError = error;
        continue;
      }

      throw error;
    } catch (error) {
      const status = error && typeof error === 'object' && 'status' in error ? error.status : undefined;
      if (status && status !== 429 && status < 500) {
        throw error;
      }
      lastError = error;
      if (attempt < maxAttempts) {
        await sleep(Math.min(2000 * attempt, 15000));
        continue;
      }
    }
  }

  throw lastError || new Error('Request failed after retries');
}

function createHeaders(env) {
  const headers = {
    'Content-Type': 'application/json',
    'X-App-Id': env.VITE_BASE44_APP_ID
  };

  if (env.VITE_BASE44_ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${env.VITE_BASE44_ACCESS_TOKEN}`;
  }

  if (env.VITE_BASE44_FUNCTIONS_VERSION) {
    headers['Base44-Functions-Version'] = env.VITE_BASE44_FUNCTIONS_VERSION;
  }

  return headers;
}

async function listVitamins(env) {
  const base = env.VITE_BASE44_SERVER_URL.replace(/\/$/, '');
  const url = `${base}/api/apps/${env.VITE_BASE44_APP_ID}/entities/Vitamin?sort=vitaminNameHe%20asc`;
  return requestWithRetry(url, { headers: createHeaders(env), method: 'GET' });
}

async function updateVitamin(env, id, payload) {
  const base = env.VITE_BASE44_SERVER_URL.replace(/\/$/, '');
  const url = `${base}/api/apps/${env.VITE_BASE44_APP_ID}/entities/Vitamin/${encodeURIComponent(id)}`;
  return requestWithRetry(url, {
    headers: createHeaders(env),
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

function summarize(vitamins) {
  let withLegacyDescription = 0;
  let withLegacyDetails = 0;
  let withAnyLegacy = 0;

  for (const vitamin of vitamins) {
    const hasDescription = hasText(vitamin.labTestDeficiencyDescription);
    const hasDetails = hasText(vitamin.labTestDeficiencyDetails);
    if (hasDescription) withLegacyDescription += 1;
    if (hasDetails) withLegacyDetails += 1;
    if (hasDescription || hasDetails) withAnyLegacy += 1;
  }

  return {
    total: vitamins.length,
    withLegacyDescription,
    withLegacyDetails,
    withAnyLegacy
  };
}

function buildMigrationPlan(vitamins) {
  const updates = [];

  for (const vitamin of vitamins) {
    const merged = mergeLabDeficiencyFields(vitamin);
    const currentTarget = (vitamin.labTestDeficiencyDetails || '').trim();
    const mergedChanged = normalizeForCompare(merged) !== normalizeForCompare(currentTarget);
    const hasLegacy = hasText(vitamin.labTestDeficiencyDescription) || hasText(vitamin.labTestDeficiencyDetails);

    if (!mergedChanged && !hasLegacy) continue;

    updates.push({
      id: vitamin.id,
      vitaminNameHe: vitamin.vitaminNameHe,
      before: {
        labTestDeficiency: vitamin.labTestDeficiency || '',
        labTestDeficiencyDescription: vitamin.labTestDeficiencyDescription || '',
        labTestDeficiencyDetails: vitamin.labTestDeficiencyDetails || ''
      },
      after: {
        labTestDeficiency: undefined,
        labTestDeficiencyDescription: '',
        labTestDeficiencyDetails: merged
      },
      reason: {
        mergedChanged,
        hasLegacy
      }
    });
  }

  return updates;
}

async function main() {
  const cwd = process.cwd();
  const env = loadEnv(cwd);
  const execute = process.argv.includes('--execute');
  const stamp = nowStamp();
  const logsDir = path.join(cwd, 'logs', 'migrations');
  fs.mkdirSync(logsDir, { recursive: true });

  const startedAt = new Date().toISOString();
  const beforeList = await listVitamins(env);
  const beforeSummary = summarize(beforeList);
  const plan = buildMigrationPlan(beforeList);

  const beforeBackupPath = path.join(logsDir, `vitamin_before_${stamp}.json`);
  fs.writeFileSync(beforeBackupPath, JSON.stringify(beforeList, null, 2));

  const result = {
    startedAt,
    mode: execute ? 'execute' : 'dry-run',
    env: {
      baseUrl: env.VITE_BASE44_SERVER_URL,
      appId: env.VITE_BASE44_APP_ID
    },
    beforeSummary,
    plannedUpdates: plan.length,
    updated: 0,
    failed: 0,
    failures: [],
    updates: []
  };

  if (execute) {
    for (const item of plan) {
      try {
        await updateVitamin(env, item.id, item.after);
        result.updated += 1;
        result.updates.push({
          id: item.id,
          vitaminNameHe: item.vitaminNameHe,
          reason: item.reason,
          beforeLengths: {
            labTestDeficiency: item.before.labTestDeficiency.length,
            labTestDeficiencyDescription: item.before.labTestDeficiencyDescription.length,
            labTestDeficiencyDetails: item.before.labTestDeficiencyDetails.length
          },
          afterLength: item.after.labTestDeficiencyDetails.length
        });
      } catch (error) {
        result.failed += 1;
        result.failures.push({
          id: item.id,
          vitaminNameHe: item.vitaminNameHe,
          error: error instanceof Error ? error.message : String(error)
        });
      }

      await sleep(250);
    }
  }

  const afterList = await listVitamins(env);
  const afterSummary = summarize(afterList);
  result.afterSummary = afterSummary;
  result.finishedAt = new Date().toISOString();

  const afterBackupPath = path.join(logsDir, `vitamin_after_${stamp}.json`);
  fs.writeFileSync(afterBackupPath, JSON.stringify(afterList, null, 2));

  const reportPath = path.join(logsDir, `vitamin_lab_migration_report_${stamp}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));

  const summaryLines = [
    `Migration mode: ${result.mode}`,
    `Before total: ${beforeSummary.total}`,
    `Before with legacy: ${beforeSummary.withAnyLegacy}`,
    `Planned updates: ${result.plannedUpdates}`,
    `Updated: ${result.updated}`,
    `Failed: ${result.failed}`,
    `After with legacy: ${afterSummary.withAnyLegacy}`,
    `Before backup: ${beforeBackupPath}`,
    `After backup: ${afterBackupPath}`,
    `Report: ${reportPath}`
  ];

  const summaryPath = path.join(logsDir, `vitamin_lab_migration_summary_${stamp}.txt`);
  fs.writeFileSync(summaryPath, `${summaryLines.join('\n')}\n`);

  for (const line of summaryLines) {
    console.log(line);
  }
  console.log(`Summary file: ${summaryPath}`);

  if (result.failed > 0) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error('Migration failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
