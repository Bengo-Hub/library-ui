'use client';

import { Select } from '@/components/ui/form';
import type { AccessionOrder } from '@/lib/library/accession-order';

/** Ascending / descending accession number order for a copy list. */
export function AccessionOrderSelect({ value, onChange, className }: {
  value: AccessionOrder;
  onChange: (o: AccessionOrder) => void;
  className?: string;
}) {
  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value === 'desc' ? 'desc' : 'asc')}
      className={className ?? 'min-w-48'}
      aria-label="Accession number order"
      title="Order copies by accession / barcode number"
    >
      <option value="asc">Accession no. ascending</option>
      <option value="desc">Accession no. descending</option>
    </Select>
  );
}
