/** Small formatting helpers shared across library-ui pages. */

export function formatMoney(value?: number | null, currency = 'KES'): string {
  const n = Number(value ?? 0);
  return `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Days remaining (negative = overdue) for a due date. */
export function daysUntil(value?: string | null): number | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  const ms = d.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function isOverdue(dueDate?: string | null): boolean {
  const d = daysUntil(dueDate);
  return d !== null && d < 0;
}

/** Debounce hook value helper (use with useState/useEffect in pages). */
export function useDebouncedValue<T>(value: T, delay = 350): T {
  // implemented inline in pages where react is imported; kept as a re-export point.
  return value;
}
