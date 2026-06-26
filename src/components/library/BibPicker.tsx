'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/base';
import { useBibs } from '@/hooks/useCatalog';
import { useDebounce } from '@/hooks/useDebounce';
import { CoverThumb } from '@/components/library/CoverThumb';

/** Searchable title selector dialog — used for placing holds against a bib record. */
export function BibPicker({
  open, orgSlug, title = 'Select a title', confirmLabel = 'Select', loading, onSelect, onCancel,
}: {
  open: boolean;
  orgSlug: string;
  title?: string;
  confirmLabel?: string;
  loading?: boolean;
  onSelect: (bibId: string) => void;
  onCancel: () => void;
}) {
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const debounced = useDebounce(q, 300);
  const { data, isFetching } = useBibs(orgSlug, { q: debounced || undefined, limit: 8 });
  const bibs = data?.data ?? [];

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button disabled={!selected || loading} onClick={() => selected && onSelect(selected)}>{loading ? 'Working…' : confirmLabel}</Button>
        </>
      }
    >
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by title, author, ISBN…"
          className="w-full h-10 rounded-lg border border-input bg-transparent pl-10 pr-3 text-sm focus:ring-1 focus:ring-ring focus:outline-none"
        />
      </div>
      <div className="max-h-64 overflow-y-auto divide-y divide-border rounded-lg border border-border">
        {isFetching && bibs.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground text-center">Searching…</p>
        ) : bibs.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground text-center">No titles found.</p>
        ) : (
          bibs.map((b) => {
            const active = selected === b.id;
            return (
              <button key={b.id} type="button" onClick={() => setSelected(b.id)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${active ? 'bg-primary/10' : 'hover:bg-accent/40'}`}>
                <CoverThumb url={b.cover_url} title={b.title} className="h-12 w-9 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{b.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{b.author}{b.available_copies != null ? ` · ${b.available_copies} avail.` : ''}</p>
                </div>
                {active && <span className="h-2.5 w-2.5 rounded-full bg-primary shrink-0" />}
              </button>
            );
          })
        )}
      </div>
    </Dialog>
  );
}
