'use client';

import { useAuthStore } from '@/store/auth';
import { useOutletFilterStore, type OutletOption } from '@/store/outlet-filter';
import { useOutletStore, LIBRARY_SELECTED_BRANCH_KEY } from '@/store/outlet';
import { apiClient } from '@/lib/api/client';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronDown, Building2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface BranchListItem {
  id: string;
  code: string;
  name: string;
  is_hq?: boolean;
  status?: string;
}

/**
 * BranchFilter — library branch selector. HQ-only (platform owner, superuser, tenant admin).
 * Selecting here drives the whole app — it updates the shared branch store and syncs the
 * X-Outlet-ID header on every API request. "All Branches" restores the HQ superset.
 * Branches come from library-api GET /{tenant}/library/branches.
 */
export function BranchFilter({ className }: { className?: string }) {
  const user = useAuthStore((s) => s.user);

  const canFilter = !!(
    user?.isPlatformOwner ||
    user?.isSuperUser ||
    user?.roles?.some((r) => ['admin', 'superuser', 'library_admin', 'super_admin'].includes(r))
  );

  const { selectedOutlet, outlets, setOutlets, selectOutlet, clearOutlet } = useOutletFilterStore();
  const setHomeOutlet = useOutletStore((s) => s.setOutlet);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const slug = (user as any)?.tenantSlug || (user as any)?.tenant_slug || '';

  function applyOutlet(o: OutletOption) {
    selectOutlet(o);
    setHomeOutlet({ id: o.id, code: o.code, name: o.name, is_hq: o.isHq });
    setOpen(false);
    setSearch('');
  }

  function applyAll() {
    clearOutlet();
    setHomeOutlet(null);
    try { localStorage.setItem(LIBRARY_SELECTED_BRANCH_KEY, 'all'); } catch { /* ignore */ }
    setOpen(false);
    setSearch('');
  }

  const { data: fetched = [] } = useQuery<BranchListItem[]>({
    queryKey: ['branch_list', slug],
    queryFn: async () => {
      const res = await apiClient.get<{ data?: BranchListItem[] } | BranchListItem[]>(`/api/v1/${slug}/library/branches`);
      const list = Array.isArray(res) ? res : (res?.data ?? []);
      return list.filter((o) => o.status !== 'archived');
    },
    enabled: canFilter && !!slug,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (fetched.length > 0) {
      setOutlets(fetched.map((o) => ({ id: o.id, code: o.code, name: o.name, isHq: o.is_hq })));
    }
  }, [fetched, setOutlets]);

  useEffect(() => {
    apiClient.setOutletID(selectedOutlet?.id ?? null);
  }, [selectedOutlet]);

  if (!canFilter || outlets.length === 0) return null;

  const filtered = search
    ? outlets.filter(
        (o) =>
          o.name.toLowerCase().includes(search.toLowerCase()) ||
          o.code.toLowerCase().includes(search.toLowerCase()),
      )
    : outlets;

  const label = selectedOutlet ? selectedOutlet.name : 'All Branches';

  return (
    <div className={cn('relative', className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-border bg-card px-2.5 sm:px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors min-w-0 max-w-[42vw] sm:min-w-40 sm:max-w-none"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Building2 className="size-4 text-muted-foreground shrink-0" />
        <span className="truncate flex-1 text-left">{label}</span>
        {selectedOutlet && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); applyAll(); }}
            className="p-0.5 rounded hover:bg-muted-foreground/20"
            aria-label="Clear branch filter"
          >
            <X className="size-3" />
          </button>
        )}
        <ChevronDown className={cn('size-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setSearch(''); }} aria-hidden />
          <div className="absolute left-0 top-full mt-1 z-50 w-64 rounded-xl border border-border bg-popover shadow-xl flex flex-col">
            {outlets.length > 5 && (
              <div className="p-2 border-b border-border">
                <input
                  autoFocus
                  placeholder="Search branches…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-accent/30 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}

            <button
              type="button"
              onClick={applyAll}
              className={cn(
                'flex items-center gap-2 w-full text-left px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors',
                !selectedOutlet && 'bg-primary/10 text-primary',
              )}
            >
              {!selectedOutlet ? <Check className="size-3.5 shrink-0" /> : <span className="size-3.5 shrink-0" />}
              All Branches
            </button>

            <div className="max-h-56 overflow-y-auto">
              {filtered.map((o) => {
                const selected = selectedOutlet?.id === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => applyOutlet(o)}
                    className={cn(
                      'flex items-center gap-2 w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors',
                      selected && 'bg-primary/5',
                    )}
                  >
                    <span className={cn(
                      'size-3.5 shrink-0 rounded-full border flex items-center justify-center',
                      selected ? 'bg-primary border-primary' : 'border-border',
                    )}>
                      {selected && <span className="size-1.5 rounded-full bg-primary-foreground" />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block truncate font-medium">{o.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {o.code}{o.isHq ? ' · HQ' : ''}
                      </span>
                    </span>
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <div className="px-3 py-4 text-xs text-muted-foreground text-center">No branches found</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
