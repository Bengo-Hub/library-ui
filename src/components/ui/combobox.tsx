'use client';

import { cn } from '@/lib/utils';
import { Check, ChevronDown, Plus, Search, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

export interface ComboboxOption {
  value: string;
  label: string;
  /** Small muted text shown after the label (e.g. a code or "custom"). */
  hint?: string;
}

interface ComboboxProps {
  value?: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  allowClear?: boolean;
  disabled?: boolean;
  /** When set, an "Add new" row appears; receives the current search text. */
  onAddNew?: (query: string) => void;
  addNewLabel?: string;
  className?: string;
}

/**
 * Searchable single-select combobox with an optional "Add new" action. Renders a table-friendly
 * trigger + a filterable popover (used for language and collection pickers in cataloging). Closes
 * on outside click / Escape; the popover is scrollable so long lists (languages) stay usable.
 */
export function Combobox({
  value, onChange, options, placeholder = 'Select…', searchPlaceholder = 'Search…',
  emptyText = 'No matches', allowClear, disabled, onAddNew, addNewLabel = 'Add new', className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => options.find((o) => o.value === value), [options, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q));
  }, [options, query]);

  function close() { setOpen(false); setQuery(''); }

  return (
    <div className={cn('relative', className)} ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-lg border border-input bg-transparent px-3 py-2.5 text-sm text-left focus:ring-1 focus:ring-ring focus:outline-none disabled:opacity-50"
      >
        <span className={cn('flex-1 truncate', !selected && 'text-muted-foreground')}>
          {selected ? selected.label : placeholder}
        </span>
        {allowClear && selected && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Clear"
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            className="p-0.5 rounded hover:bg-accent text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" aria-hidden onClick={close} />
          <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-border bg-popover shadow-xl flex flex-col overflow-hidden">
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full bg-accent/30 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto py-1">
              {filtered.map((o) => {
                const active = o.value === value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => { onChange(o.value); close(); }}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent transition-colors',
                      active && 'bg-primary/5',
                    )}
                  >
                    <Check className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'opacity-0')} />
                    <span className="flex-1 truncate">{o.label}</span>
                    {o.hint && <span className="text-xs text-muted-foreground shrink-0">{o.hint}</span>}
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <p className="px-3 py-3 text-xs text-muted-foreground text-center">{emptyText}</p>
              )}
            </div>

            {onAddNew && (
              <button
                type="button"
                onClick={() => { onAddNew(query.trim()); close(); }}
                className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-primary border-t border-border hover:bg-accent transition-colors"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span className="truncate">{query.trim() ? `${addNewLabel}: “${query.trim()}”` : addNewLabel}</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
