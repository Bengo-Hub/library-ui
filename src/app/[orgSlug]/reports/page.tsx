'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { BarChart3, BookOpen, AlertTriangle, BookMarked, Users, CircleDollarSign } from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { useLibrarySummary, usePopularTitles } from '@/hooks/useReports';
import { PageHeader, StatCard, Skeleton } from '@/components/ui/page';
import { Card } from '@/components/ui/base';
import { formatMoney } from '@/lib/format';

export default function ReportsPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const { data: summary, isLoading } = useLibrarySummary(orgSlug);
  const { data: popular } = usePopularTitles(orgSlug, 30, 10);

  const trend = summary?.circulation_trend ?? [];

  const cards = [
    { label: 'Active Loans', value: summary?.active_loans ?? 0, icon: <BookOpen className="h-5 w-5" />, accent: 'bg-blue-500/15 text-blue-500' },
    { label: 'Overdue', value: summary?.overdue_loans ?? 0, icon: <AlertTriangle className="h-5 w-5" />, accent: 'bg-rose-500/15 text-rose-500' },
    { label: 'Holds Ready', value: summary?.holds_ready ?? 0, icon: <BookMarked className="h-5 w-5" />, accent: 'bg-amber-500/15 text-amber-500' },
    { label: 'Active Members', value: summary?.active_members ?? 0, icon: <Users className="h-5 w-5" />, accent: 'bg-emerald-500/15 text-emerald-500' },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader title="Reports" subtitle="Circulation and collection insights" icon={<BarChart3 className="h-5 w-5" />} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
          : cards.map((c) => <StatCard key={c.label} label={c.label} value={c.value.toLocaleString()} icon={c.icon} accent={c.accent} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <StatCard label="Outstanding Fines" value={formatMoney(summary?.outstanding_fines)} icon={<CircleDollarSign className="h-5 w-5" />} accent="bg-rose-500/15 text-rose-500" />
        <StatCard label="Checkouts Today" value={(summary?.checkouts_today ?? 0).toLocaleString()} icon={<BookOpen className="h-5 w-5" />} />
        <StatCard label="Returns Today" value={(summary?.returns_today ?? 0).toLocaleString()} icon={<BookOpen className="h-5 w-5" />} />
      </div>

      <h2 className="mt-8 mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Circulation (last 30 days)</h2>
      <Card className="p-4">
        {trend.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">No circulation data available.</div>
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

      <h2 className="mt-8 mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Most Borrowed</h2>
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
    </div>
  );
}
