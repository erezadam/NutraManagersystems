export function nowDateStamp(): string {
  return new Date().toISOString().split('T')[0];
}

export function formatDate(value?: string): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('he-IL');
}
