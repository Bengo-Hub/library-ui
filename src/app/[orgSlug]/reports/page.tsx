'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Download, BarChart3, BookOpen, AlertTriangle, BookMarked, Users, CircleDollarSign, TrendingUp, Package, Layers } from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Cell,
} from 'recharts';
import {
  useLibrarySummary, usePopularTitles,
  useMemberActivity, useOverdueAging, useItemMovement, useFineAging,
  useAcquisitionSpend, useCatalogStats, useEbookUsage,
} from '@/hooks/useReports';
import { reportsApi } from '@/lib/api/reports';
import { PageHeader, StatCard, Skeleton } from '@/components/ui/page';
import { Button, Badge, Card } from '@/components/ui/base';
import { CapsuleTabs } from '@/components/ui/tabs';
import { DataTable, type DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { formatDate, formatMoney } from '@/lib/format';
import type { MemberActivityRow, ItemMovementRow, FineAgingRow } from '@/lib/api/reports';

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'circulation', label: 'Circulation' },
  { value: 'members', label: 'Members' },
  { value: 'catalog', label: 'Catalog' },
  { value: 'acquisitions', label: 'Acquisitions' },
  { value: 'fines', label: 'Fines' },
  { value: 'ebooks', label: 'E-books' },
];

const BUCKET_COLORS: Record<string, string> = {
  '0-7': '#22c55e', '8-14': '#f59e0b', '15-30': '#f97316', '31+': '#ef4444',
};

function ExportBtn({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} download>
      <Button variant="outline" size="sm" className="gap-1.5"><Download className="h-4 w-4" /> {label}</Button>
    </a>
  );
}

export default function ReportsPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const [tab, setTab] = useState('overview');

  const { data: summary, isLoading } = useLibrarySummary(orgSlug);
  const { data: popular } = usePopularTitles(orgSlug, 30, 10);
  const { data: memberActivity } = useMemberActivity(orgSlug, 90);
  const { data: overdueAging } = useOverdueAging(orgSlug);
  const { data: itemMovement } = useItemMovement(orgSlug, 90);
  const { data: fineAging } = useFineAging(orgSlug);
  const { data: acqSpend } = useAcquisitionSpend(orgSlug);
  const { data: catalogStats } = useCatalogStats(orgSlug);
  const { data: ebookUsage } = useEbookUsage(orgSlug, 30);

  const trend = summary?.circulation_trend ?? [];

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <PageHeader title="Reports" subtitle="Circulation, collection and financial insights" icon={<BarChart3 className="h-5 w-5" />} />

      <CapsuleTabs options={TABS} value={tab} onChange={setTab} />

      {/* ── OVERVIEW ─────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
              : <>
                  <StatCard label="Active Loans" value={(summary?.active_loans ?? 0).toLocaleString()} icon={<BookOpen className="h-5 w-5" />} accent="bg-blue-500/15 text-blue-500" />
                  <StatCard label="Overdue" value={(summary?.overdue_loans ?? 0).toLocaleString()} icon={<AlertTriangle className="h-5 w-5" />} accent="bg-rose-500/15 text-rose-500" />
                  <StatCard label="Holds Ready" value={(summary?.holds_ready ?? 0).toLocaleString()} icon={<BookMarked className="h-5 w-5" />} accent="bg-amber-500/15 text-amber-500" />
                  <StatCard label="Active Members" value={(summary?.active_members ?? 0).toLocaleString()} icon={<Users className="h-5 w-5" />} accent="bg-emerald-500/15 text-emerald-500" />
                </>}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <StatCard label="Outstanding Fines" value={formatMoney(summary?.outstanding_fines)} icon={<CircleDollarSign className="h-5 w-5" />} accent="bg-rose-500/15 text-rose-500" />
            <StatCard label="Checkouts Today" value={(summary?.checkouts_today ?? 0).toLocaleString()} icon={<BookOpen className="h-5 w-5" />} />
            <StatCard label="Returns Today" value={(summary?.returns_today ?? 0).toLocaleString()} icon={<BookOpen className="h-5 w-5" />} />
          </div>

          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Circulation (last 14 days)</h2>
          <Card className="p-4">
            {trend.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">No circulation data yet.</div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="co" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} />
                    <Area type="monotone" dataKey="checkouts" stroke="hsl(var(--primary))" fill="url(#co)" strokeWidth={2} />
                    <Area type="monotone" dataKey="returns" stroke="hsl(var(--chart-2))" fill="transparent" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Most Borrowed</h2>
          <Card>
            {(popular?.data?.length ?? 0) === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No data yet.</div>
            ) : (
              <ul className="divide-y divide-border">
                {popular!.data.map((t, i) => (
                  <li key={t.id} className="flex items-center gap-4 px-5 py-3">
                    <span className="h-7 w-7 shrink-0 rounded-lg bg-accent flex items-center justify-center text-xs font-bold text-muted-foreground">{i + 1}</span>
                    <Link href={`/${orgSlug}/catalog/${t.id}`} className="flex-1 truncate font-medium hover:text-primary">{t.title}</Link>
                    <span className="text-sm text-muted-foreground">{t.loans.toLocaleString()} loans</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}

      {/* ── CIRCULATION ──────────────────────────────────────────────── */}
      {tab === 'circulation' && (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Overdue Aging</h2>
            <ExportBtn href={reportsApi.csvUrl(orgSlug, 'overdue-aging')} label="Export CSV" />
          </div>
          <Card className="p-4">
            {(overdueAging?.data?.length ?? 0) === 0 ? (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">No overdue loans.</div>
            ) : (
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overdueAging?.data ?? []} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {(overdueAging?.data ?? []).map((entry) => (
                        <Cell key={entry.bucket} fill={BUCKET_COLORS[entry.bucket] ?? '#94a3b8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2"><Package className="h-4 w-4" /> Item Movement (last 90 days)</h2>
            <ExportBtn href={reportsApi.csvUrl(orgSlug, 'item-movement')} label="Export CSV" />
          </div>
          <DataTable
            columns={[
              { key: 'barcode', header: 'Barcode', accessor: (r: ItemMovementRow) => r.barcode, render: (r: ItemMovementRow) => <span className="font-mono text-sm">{r.barcode}</span> },
              { key: 'title', header: 'Title', primary: true, sortable: true, accessor: (r: ItemMovementRow) => r.title, render: (r: ItemMovementRow) => <span className="font-medium">{r.title}</span> },
              { key: 'checkouts', header: 'Checkouts', align: 'right', sortable: true, accessor: (r: ItemMovementRow) => r.checkouts, render: (r: ItemMovementRow) => <span className="font-medium">{r.checkouts}</span> },
            ] satisfies DataTableColumn<ItemMovementRow>[]}
            rows={itemMovement?.data ?? []}
            rowKey={(r: ItemMovementRow) => r.copy_id}
          />
        </>
      )}

      {/* ── MEMBERS ──────────────────────────────────────────────────── */}
      {tab === 'members' && (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4" /> Most Active Borrowers (last 90 days)</h2>
            <ExportBtn href={reportsApi.csvUrl(orgSlug, 'member-activity')} label="Export CSV" />
          </div>
          <DataTable
            columns={[
              { key: 'membership_no', header: 'ID', accessor: (r: MemberActivityRow) => r.membership_no, render: (r: MemberActivityRow) => <span className="font-mono text-xs">{r.membership_no}</span> },
              { key: 'name', header: 'Name', primary: true, sortable: true, accessor: (r: MemberActivityRow) => r.name || r.member_id, render: (r: MemberActivityRow) => <span className="font-medium">{r.name || r.member_id.slice(0, 8)}</span> },
              { key: 'loans', header: 'Loans', align: 'right', sortable: true, accessor: (r: MemberActivityRow) => r.loans, render: (r: MemberActivityRow) => <span className="font-medium">{r.loans}</span> },
            ] satisfies DataTableColumn<MemberActivityRow>[]}
            rows={memberActivity?.data ?? []}
            rowKey={(r: MemberActivityRow) => r.member_id}
          />
        </>
      )}

      {/* ── CATALOG ──────────────────────────────────────────────────── */}
      {tab === 'catalog' && (
        <>
          {catalogStats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Titles" value={catalogStats.total_titles.toLocaleString()} icon={<BookOpen className="h-5 w-5" />} />
              <StatCard label="Total Copies" value={catalogStats.total_copies.toLocaleString()} icon={<Layers className="h-5 w-5" />} />
              <StatCard label="Collection Value" value={formatMoney(catalogStats.total_value)} icon={<CircleDollarSign className="h-5 w-5" />} accent="bg-emerald-500/15 text-emerald-500" />
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {catalogStats?.by_format && (
              <Card className="p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">By Format</h3>
                <ul className="space-y-2">
                  {catalogStats.by_format.map((r) => (
                    <li key={r.key} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{r.key}</span>
                      <span className="font-medium">{r.count}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {catalogStats?.by_language && (
              <Card className="p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">By Language</h3>
                <ul className="space-y-2">
                  {catalogStats.by_language.slice(0, 8).map((r) => (
                    <li key={r.key} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{r.key}</span>
                      <span className="font-medium">{r.count}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {catalogStats?.by_copy_status && (
              <Card className="p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Copy Status</h3>
                <ul className="space-y-2">
                  {catalogStats.by_copy_status.map((r) => (
                    <li key={r.key} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{r.key}</span>
                      <span className="font-medium">{r.count}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>

          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2"><CircleDollarSign className="h-4 w-4" /> Collection Valuation</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {catalogStats?.value_by_branch && catalogStats.value_by_branch.length > 0 && (
              <Card className="p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Value by Branch</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={catalogStats.value_by_branch} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatMoney(v)} stroke="hsl(var(--muted-foreground))" />
                      <YAxis type="category" dataKey="key" width={110} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip formatter={(v) => formatMoney(Number(v))} contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}
            {catalogStats?.value_by_copy_status && catalogStats.value_by_copy_status.length > 0 && (
              <Card className="p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Value by Copy Status</h3>
                <ul className="space-y-2">
                  {catalogStats.value_by_copy_status.map((r) => (
                    <li key={r.key} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{r.key}</span>
                      <span className="font-medium">{formatMoney(r.value)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </>
      )}

      {/* ── ACQUISITIONS ─────────────────────────────────────────────── */}
      {tab === 'acquisitions' && (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Fund Utilisation</h2>
            <ExportBtn href={reportsApi.csvUrl(orgSlug, 'acquisition-spend')} label="Export CSV" />
          </div>
          {(acqSpend?.funds?.length ?? 0) === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">No fund data yet.</Card>
          ) : (
            <div className="space-y-3">
              {acqSpend!.funds.map((f) => {
                const pct = f.allocated > 0 ? Math.min(100, (f.spent / f.allocated) * 100) : 0;
                return (
                  <Card key={f.fund_id} className="p-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium">{f.name}</span>
                      <span className="text-muted-foreground">{formatMoney(f.spent)} / {formatMoney(f.allocated)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{pct.toFixed(1)}% used · {formatMoney(f.remaining)} remaining</div>
                  </Card>
                );
              })}
            </div>
          )}

          {(acqSpend?.vendors?.length ?? 0) > 0 && (
            <>
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mt-2">Spend by Vendor</h2>
              <DataTable
                columns={[
                  { key: 'name', header: 'Vendor', primary: true, sortable: true, accessor: (v: { vendor_id: string; name: string; spend: number }) => v.name || v.vendor_id, render: (v: { vendor_id: string; name: string; spend: number }) => <span className="font-medium">{v.name || v.vendor_id.slice(0, 8)}</span> },
                  { key: 'spend', header: 'Total Spend', align: 'right', sortable: true, accessor: (v: { vendor_id: string; name: string; spend: number }) => v.spend, render: (v: { vendor_id: string; name: string; spend: number }) => <span className="font-medium">{formatMoney(v.spend)}</span> },
                ] satisfies DataTableColumn<{ vendor_id: string; name: string; spend: number }>[]}
                rows={acqSpend!.vendors}
                rowKey={(v: { vendor_id: string; name: string; spend: number }) => v.vendor_id}
              />
            </>
          )}
        </>
      )}

      {/* ── FINES ────────────────────────────────────────────────────── */}
      {tab === 'fines' && (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2"><CircleDollarSign className="h-4 w-4" /> Outstanding Fines by Age</h2>
            <ExportBtn href={reportsApi.csvUrl(orgSlug, 'fine-aging')} label="Export CSV" />
          </div>
          <DataTable
            columns={[
              { key: 'membership_no', header: 'ID', accessor: (r: FineAgingRow) => r.membership_no, render: (r: FineAgingRow) => <span className="font-mono text-xs">{r.membership_no}</span> },
              { key: 'name', header: 'Member', primary: true, sortable: true, accessor: (r: FineAgingRow) => r.name || r.member_id, render: (r: FineAgingRow) => <span className="font-medium">{r.name || r.member_id.slice(0, 8)}</span> },
              { key: 'days_old', header: 'Days Old', align: 'right', sortable: true, accessor: (r: FineAgingRow) => r.days_old, render: (r: FineAgingRow) => (
                <Badge variant={r.days_old > 30 ? 'error' : r.days_old > 14 ? 'warning' : 'outline'}>{r.days_old}d</Badge>
              ) },
              { key: 'outstanding', header: 'Outstanding', align: 'right', sortable: true, accessor: (r: FineAgingRow) => r.outstanding, render: (r: FineAgingRow) => <span className="font-medium text-red-600">{formatMoney(r.outstanding)}</span> },
            ] satisfies DataTableColumn<FineAgingRow>[]}
            rows={fineAging?.data ?? []}
            rowKey={(r: FineAgingRow) => r.member_id + r.days_old}
          />
        </>
      )}

      {/* ── E-BOOKS ──────────────────────────────────────────────────── */}
      {tab === 'ebooks' && (
        <>
          {ebookUsage && (
            <div className="grid grid-cols-2 gap-4">
              <StatCard label="Loans (last 30d)" value={ebookUsage.total_loans.toLocaleString()} icon={<BookOpen className="h-5 w-5" />} accent="bg-blue-500/15 text-blue-500" />
              <StatCard label="Active Now" value={ebookUsage.active_loans_now.toLocaleString()} icon={<TrendingUp className="h-5 w-5" />} accent="bg-emerald-500/15 text-emerald-500" />
            </div>
          )}
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Popular E-books</h2>
          <Card>
            {(ebookUsage?.popular_titles?.length ?? 0) === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No e-book usage data yet.</div>
            ) : (
              <ul className="divide-y divide-border">
                {ebookUsage!.popular_titles.map((t, i) => (
                  <li key={t.ebook_id} className="flex items-center gap-4 px-5 py-3">
                    <span className="h-7 w-7 shrink-0 rounded-lg bg-accent flex items-center justify-center text-xs font-bold text-muted-foreground">{i + 1}</span>
                    <span className="flex-1 truncate font-medium">{t.title || t.ebook_id.slice(0, 8)}</span>
                    <span className="text-sm text-muted-foreground">{t.loans} loans</span>
                    <span className="text-xs text-muted-foreground">{t.avg_hours.toFixed(1)}h avg</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
