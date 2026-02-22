import type { Vitamin, VitaminConflict } from '../types/entities';

function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][^>]*>/i.test(value);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toPlainText(value: string): string {
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

function normalizeForCompare(value: string): string {
  return toPlainText(value)
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function appendMissingSection(sections: string[], baseCompare: string, label: string, rawValue: string | undefined): void {
  const value = rawValue?.trim() ?? '';
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

function appendRawSection(sections: string[], rawValue: string | undefined): void {
  const value = rawValue?.trim() ?? '';
  if (!value) return;
  const valueCompare = normalizeForCompare(value);
  const currentCompare = normalizeForCompare(sections.join('\n\n'));
  if (valueCompare && currentCompare.includes(valueCompare)) return;
  sections.push(looksLikeHtml(value) ? value : escapeHtml(value).replace(/\n/g, '<br>'));
}

export function mergeLabDeficiencyFields(vitamin: Pick<Vitamin, 'labTestDeficiency' | 'labTestDeficiencyDescription' | 'labTestDeficiencyDetails'>): string {
  const sections: string[] = [];
  appendRawSection(sections, vitamin.labTestDeficiencyDetails);
  appendRawSection(sections, vitamin.labTestDeficiency);
  const baseCompare = normalizeForCompare(sections.join('\n\n'));
  appendMissingSection(sections, baseCompare, 'תיאור החוסר', vitamin.labTestDeficiencyDescription);

  return sections.join('<br><br>').trim();
}

export function collectChoiceOptions(defaultOptions: string[], listValues: Array<string | undefined>, storedOptions: string[] = []): string[] {
  const next = new Map<string, string>();
  const push = (value: string | undefined) => {
    const trimmed = value?.trim() ?? '';
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (!next.has(key)) next.set(key, trimmed);
  };

  defaultOptions.forEach((option) => push(option));
  storedOptions.forEach((option) => push(option));
  listValues.forEach((value) => push(value));

  return [...next.values()].sort((a, b) => a.localeCompare(b, 'he'));
}

export function loadStoredOptions(storageKey: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((value) => String(value ?? '').trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export function persistStoredOptions(storageKey: string, options: string[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey, JSON.stringify(options));
}

function textOrDash(value?: string): string {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : '-';
}

export function labelsFromConflictsWithDetails(
  conflicts: VitaminConflict[] | undefined,
  nameById: Map<string, string>
): string[] {
  return (conflicts ?? [])
    .map((item) => {
      const label = nameById.get(item.vitaminId) ?? item.vitaminId;
      const explanation = textOrDash(item.explanation);
      return explanation === '-' ? label : `${label}: ${explanation}`;
    })
    .sort((a, b) => a.localeCompare(b, 'he'));
}
