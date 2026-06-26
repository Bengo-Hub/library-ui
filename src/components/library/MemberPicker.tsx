'use client';

import { useState } from 'react';
import { Search, User } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/base';
import { useMembers } from '@/hooks/useMembers';
import { useDebounce } from '@/hooks/useDebounce';

/** Searchable member selector dialog — reused by place-hold, membership fee, etc. */
export function MemberPicker({
  open, orgSlug, title, description, confirmLabel = 'Select', loading, onSelect, onCancel,
}: {
  open: boolean;
  orgSlug: string;
  title: string;
  description?: string;
  confirmLabel?: string;
  loading?: boolean;
  onSelect: (memberId: string) => void;
  onCancel: () => void;
}) {
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const debounced = useDebounce(q, 300);
  const { data, isFetching } = useMembers(orgSlug, { q: debounced || undefined, status: 'active', limit: 8 });
  const members = data?.data ?? [];

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button disabled={!selected || loading} onClick={() => selected && onSelect(selected)}>
            {loading ? 'Working…' : confirmLabel}
          </Button>
        </>
      }
    >
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search member by name, no. or phone…"
          className="w-full h-10 rounded-lg border border-input bg-transparent pl-10 pr-3 text-sm focus:ring-1 focus:ring-ring focus:outline-none"
        />
      </div>
      <div className="max-h-64 overflow-y-auto divide-y divide-border rounded-lg border border-border">
        {isFetching && members.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground text-center">Searching…</p>
        ) : members.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground text-center">No active members found.</p>
        ) : (
          members.map((m) => {
            const active = selected === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelected(m.id)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${active ? 'bg-primary/10' : 'hover:bg-accent/40'}`}
              >
                <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{m.full_name ?? `${m.first_name} ${m.last_name}`}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {m.membership_no}{m.outstanding_fines ? ` · fines due` : ''}{typeof m.active_loans === 'number' ? ` · ${m.active_loans} on loan` : ''}
                  </p>
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
