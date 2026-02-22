export function downloadText(filename: string, content: string, contentType: string): void {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function toCsv(rows: string[][]): string {
  return rows
    .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

export function parseCsv(csvText: string): string[][] {
  return csvText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) ?? [];
      return match.map((token) => token.replace(/^"|"$/g, '').replace(/""/g, '"'));
    });
}

export async function readFileText(file: File): Promise<string> {
  return file.text();
}
