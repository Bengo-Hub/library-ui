'use client';

import { cn } from '@/lib/utils';
import { Check, ChevronDown, Plus, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/useDebounce';
import { catalogTermsApi, type TermKind } from '@/lib/api/catalog-terms';

function useTermOptions(orgSlug: string, kind: TermKind, query: string) {
  const debounced = useDebounce(query, 250);
  return useQuery({
    queryKey: ['catalog-terms', orgSlug, kind, debounced],
    queryFn: () => catalogTermsApi.list(orgSlug, kind, debounced || undefined),
    staleTime: 30_000,
  });
}

const fieldBtn =
  'flex w-full items-center gap-2 rounded-lg border border-input bg-transparent px-3 py-2.5 text-sm text-left focus:ring-1 focus:ring-ring focus:outline-none disabled:opacity-50';

/**
 * Chip-based, searchable multi-select backed by a cataloging dictionary. Filters existing terms as
 * the user types; an "Add" row commits free text not already in the list (persisted on save). Used
 * for authors and subjects in the cataloging form.
 */
export function TermMultiSelect({
  orgSlug, kind, values, onChange, placeholder = 'Add…', addLabel = 'Add', className,
}: {
  orgSlug: string;
  kind: TermKind;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  addLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const { data: options = [] } = useTermOptions(orgSlug, kind, open ? query : '');

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    if (open) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const selectedSet = useMemo(() => new Set(values.map((v) => v.toLowerCase())), [values]);
  const filtered = options.filter((o) => !selectedSet.has(o.toLowerCase()));
  const trimmed = query.trim();
  const canAdd = trimmed.length > 0 && !selectedSet.has(trimmed.toLowerCase());

  function add(value: string) {
    const v = value.trim();
    if (!v || selectedSet.has(v.toLowerCase())) { setQuery(''); return; }
    onChange([...values, v]);
    setQuery('');
  }
  function remove(value: string) {
    onChange(values.filter((v) => v !== value));
  }

  return (
    <div className={cn('relative', className)} ref={ref}>
      <div className="min-h-[2.75rem] w-full rounded-lg border border-input bg-transparent px-2 py-1.5 flex flex-wrap items-center gap-1.5 focus-within:ring-1 focus-within:ring-ring">
        {values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary px-2 py-1 text-xs font-medium">
            {v}
            <button type="button" aria-label={`Remove ${v}`} onClick={() => remove(v)} className="hover:text-primary/70">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canAdd) { e.preventDefault(); add(trimmed); }
            if (e.key === 'Backspace' && !query && values.length) remove(values[values.length - 1]);
          }}
          placeholder={values.length ? '' : placeholder}
          className="flex-1 min-w-[8rem] bg-transparent px-1 py-1 text-sm focus:outline-none"
        />
      </div>

      {open && (filtered.length > 0 || canAdd) && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-border bg-popover shadow-xl overflow-hidden">
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.map((o) => (
              <button key={o} type="button" onClick={() => add(o)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent">
                <Check className="h-4 w-4 opacity-0" />
                <span className="flex-1 truncate">{o}</span>
              </button>
            ))}
          </div>
          {canAdd && (
            <button type="button" onClick={() => add(trimmed)} className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-primary border-t border-border hover:bg-accent">
              <Plus className="h-4 w-4 shrink-0" />
              <span className="truncate">{addLabel}: “{trimmed}”</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Single-value searchable select backed by a cataloging dictionary, with free-text "add new". Used
 * for publisher and place of publication in the cataloging form.
 */
export function TermSelect({
  orgSlug, kind, value, onChange, placeholder = 'Select…', addLabel = 'Use', className,
}: {
  orgSlug: string;
  kind: TermKind;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  addLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const { data: options = [] } = useTermOptions(orgSlug, kind, open ? query : '');

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    if (open) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const trimmed = query.trim();
  const lower = options.map((o) => o.toLowerCase());
  const canAdd = trimmed.length > 0 && !lower.includes(trimmed.toLowerCase());

  function pick(v: string) { onChange(v); setQuery(''); setOpen(false); }

  return (
    <div className={cn('relative', className)} ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)} className={fieldBtn}>
        <span className={cn('flex-1 truncate', !value && 'text-muted-foreground')}>{value || placeholder}</span>
        {value && (
          <span role="button" tabIndex={0} aria-label="Clear" onClick={(e) => { e.stopPropagation(); onChange(''); }} className="p-0.5 rounded hover:bg-accent text-muted-foreground">
            <X className="h-3.5 w-3.5" />
          </span>
        )}
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-border bg-popover shadow-xl flex flex-col overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && canAdd) { e.preventDefault(); pick(trimmed); } }}
                placeholder="Search…" className="w-full bg-accent/30 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            {options.map((o) => (
              <button key={o} type="button" onClick={() => pick(o)} className={cn('flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent', o === value && 'bg-primary/5')}>
                <Check className={cn('h-4 w-4 shrink-0', o === value ? 'text-primary' : 'opacity-0')} />
                <span className="flex-1 truncate">{o}</span>
              </button>
            ))}
            {options.length === 0 && !canAdd && <p className="px-3 py-3 text-xs text-muted-foreground text-center">No matches</p>}
          </div>
          {canAdd && (
            <button type="button" onClick={() => pick(trimmed)} className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-primary border-t border-border hover:bg-accent">
              <Plus className="h-4 w-4 shrink-0" />
              <span className="truncate">{addLabel}: “{trimmed}”</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
