import { parseCsv, readFileText } from './file-io';

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/[|,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

export async function parseImportFile(file: File): Promise<Record<string, unknown>[]> {
  const text = await readFileText(file);
  const lower = file.name.toLowerCase();

  if (lower.endsWith('.json')) {
    const parsed = JSON.parse(text) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error('JSON import must be an array');
    }
    return parsed.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null);
  }

  if (lower.endsWith('.csv')) {
    const rows = parseCsv(text);
    if (rows.length < 2) {
      return [];
    }
    const headers = rows[0];
    return rows.slice(1).map((row) => {
      const entry: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        entry[header] = row[index] ?? '';
      });
      return entry;
    });
  }

  throw new Error('Unsupported import format. Use .json or .csv');
}

export function asOptionalString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const str = String(value).trim();
  return str ? str : undefined;
}

export function asOptionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

export function asStringArray(value: unknown): string[] {
  return toStringArray(value);
}
