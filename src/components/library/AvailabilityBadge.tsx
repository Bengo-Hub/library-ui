'use client';

import { Badge } from '@/components/ui/base';
import type { BibRecord } from '@/lib/api/catalog';

/** Shows availability for a bib record: green when copies free, amber when all out / on hold. */
export function AvailabilityBadge({ bib }: { bib: Pick<BibRecord, 'available_copies' | 'total_copies' | 'on_hold'> }) {
  const available = bib.available_copies ?? 0;
  const total = bib.total_copies ?? 0;

  if (total === 0) return <Badge variant="outline">No copies</Badge>;
  if (available > 0) return <Badge variant="success">{available} of {total} available</Badge>;
  if ((bib.on_hold ?? 0) > 0) return <Badge variant="warning">On hold ({bib.on_hold})</Badge>;
  return <Badge variant="error">All on loan</Badge>;
}
