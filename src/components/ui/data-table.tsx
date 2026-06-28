'use client';

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import { Skeleton } from './page';

/**
 * Responsive data table. On md+ it renders a normal <table>; on phones each row collapses into
 * a stacked card (label + value pairs) — the native pattern for dense data on small screens
 * (UX rule: `data-table` mobile card view). Drive it from a column config so every list page
 * (members, copies, circulation, fines…) gets identical, accessible responsive behaviour.
 */

export interface Column<T> {
  /** Stable key for React + the mobile label fallback. */
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  /** Extra classes for the desktop <td>/<th>. */
  className?: string;
  /** Use this column as the card title on mobile (big, top-left). One per table. */
  primary?: boolean;
  /** Render this column in the card's top-right action slot (e.g. an edit button / badge). */
  actions?: boolean;
  /** Hide this column entirely on mobile cards (e.g. redundant with the primary cell). */
  hideOnMobile?: boolean;
  /** Label shown before the value in the mobile card. Defaults to `header` when it's a string. */
  mobileLabel?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  skeletonRows?: number;
  /** Shown when not loading and rows is empty. */
  empty?: ReactNode;
  className?: string;
}

const alignClass = { left: 'text-left', right: 'text-right', center: 'text-center' } as const;

export function DataTable<T>({
  columns, rows, rowKey, onRowClick, loading, skeletonRows = 6, empty, className,
}: DataTableProps<T>) {
  if (loading) {
    return <div className="p-4 sm:p-6 space-y-2">{Array.from({ length: skeletonRows }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;
  }
  if (rows.length === 0) {
    return <>{empty}</>;
  }

  const primary = columns.find((c) => c.primary);
  const actions = columns.filter((c) => c.actions);
  const body = columns.filter((c) => !c.primary && !c.actions && !c.hideOnMobile);

  return (
    <>
      {/* Desktop / tablet table */}
      <div className={cn('hidden md:block overflow-x-auto', className)}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
              {columns.map((c) => (
                <th key={c.key} className={cn('px-5 py-3 font-semibold', alignClass[c.align ?? 'left'], c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                className={cn('hover:bg-accent/30 transition-colors', onRowClick && 'cursor-pointer')}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn('px-5 py-3 align-middle', alignClass[c.align ?? 'left'], c.className)}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <ul className="md:hidden divide-y divide-border">
        {rows.map((row) => (
          <li
            key={rowKey(row)}
            className={cn('p-4 active:bg-accent/40 transition-colors', onRowClick && 'cursor-pointer')}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {primary && <div className="font-semibold text-foreground break-words">{primary.cell(row)}</div>}
              </div>
              {actions.length > 0 && (
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {actions.map((c) => <div key={c.key}>{c.cell(row)}</div>)}
                </div>
              )}
            </div>
            {body.length > 0 && (
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                {body.map((c) => (
                  <div key={c.key} className="min-w-0">
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {c.mobileLabel ?? (typeof c.header === 'string' ? c.header : c.key)}
                    </dt>
                    <dd className="text-sm text-foreground mt-0.5 break-words">{c.cell(row)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
