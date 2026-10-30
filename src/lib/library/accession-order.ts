'use client';

import { useCallback, useEffect, useState } from 'react';

/** Accession / barcode number order for copy lists. Ascending = oldest accession first. */
export type AccessionOrder = 'asc' | 'desc';

const STORAGE_KEY = 'library-accession-order';

function readStored(): AccessionOrder {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'desc' ? 'desc' : 'asc';
  } catch {
    return 'asc';
  }
}

/** The viewer's chosen accession order, remembered in this browser across pages and visits. */
export function useAccessionOrder(): [AccessionOrder, (o: AccessionOrder) => void] {
  // Starts ascending and picks up the stored choice after mount, so the server render and the
  // first client render agree.
  const [order, setOrder] = useState<AccessionOrder>('asc');
  useEffect(() => { setOrder(readStored()); }, []);
  const update = useCallback((o: AccessionOrder) => {
    setOrder(o);
    try { localStorage.setItem(STORAGE_KEY, o); } catch { /* private window: keep it in memory */ }
  }, []);
  return [order, update];
}

/** The list API's ?sort= value for an accession order (see library-api copyOrder). */
export function accessionSortParam(order: AccessionOrder): string {
  return order === 'desc' ? '-accession' : 'accession';
}

// The number part of an accession number: its first run of digits, so 305-2026 comes before
// 1278-2026 and ACC000099 before ACC000100. Mirrors the library-api ORDER BY.
function accessionKey(value: string): number | null {
  const m = /\d+/.exec(value);
  return m ? Number(m[0]) : null;
}

/** Compares two accession / barcode numbers by their number, then their text; no digits sorts last. */
export function compareAccession(a: string, b: string): number {
  const ka = accessionKey(a);
  const kb = accessionKey(b);
  if (ka !== kb) {
    if (ka == null) return 1;
    if (kb == null) return -1;
    return ka - kb;
  }
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

/** A copy list in accession order (a new array; the input is left as is). */
export function sortByAccession<T extends { barcode: string }>(rows: T[], order: AccessionOrder): T[] {
  const sorted = [...rows].sort((x, y) => compareAccession(x.barcode ?? '', y.barcode ?? ''));
  return order === 'desc' ? sorted.reverse() : sorted;
}
