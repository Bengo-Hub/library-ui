'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  AlertTriangle,
  BookMarked,
  BookOpen,
  BookText,
  CircleDollarSign,
  Library,
  Users,
  Tablet,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import { useLibrarySummary, usePopularTitles } from '@/hooks/useReports';
import { StatCard, PageHeader, Skeleton } from '@/components/ui/page';
import { Card } from '@/components/ui/base';
import { formatMoney } from '@/lib/format';

const CHART_COLORS = ['#7c3aed', '#06b6d4', '#f59e0b', '#10b981', '#ef4444'];

const QUICK_ACTIONS = [
  { label: 'Circulation Desk', href: '/circulation', icon: BookOpen, desc: 'Check out & return' },
  { label: 'Catalog (OPAC)', href: '/catalog', icon: Library, desc: 'Search the collection' },
  { label: 'Cataloging', href: '/cataloging', icon: BookText, desc: 'Add a new title' },
  { label: 'Members', href: '/members', icon: Users, desc: 'Manage patrons' },
];

export default function DashboardPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const { data: summary, isLoading } = useLibrarySummary(orgSlug);
  const { data: popular } = usePopularTitles(orgSlug, 30, 8);

  const cards = [
    { label: 'Active Loans', value: summary?.active_loans ?? 0, icon: <BookOpen className="h-5 w-5" />, accent: 'bg-blue-500/15 text-blue-500' },
    { label: 'Overdue', value: summary?.overdue_loans ?? 0, icon: <AlertTriangle className="h-5 w-5" />, accent: 'bg-rose-500/15 text-rose-500' },
    { label: 'Holds Ready', value: summary?.holds_ready ?? 0, icon: <BookMarked className="h-5 w-5" />, accent: 'bg-amber-500/15 text-amber-500' },
    { label: 'Members', value: summary?.total_members ?? 0, icon: <Users className="h-5 w-5" />, accent: 'bg-emerald-500/15 text-emerald-500' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Dashboard" subtitle="Library operations at a glance" icon={<Library className="h-5 w-5" />} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
          : cards.map((c) => (
              <StatCard key={c.label} label={c.label} value={c.value.toLocaleString()} icon={c.icon} accent={c.accent} />
            ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <StatCard
          label="Outstanding Fines"
          value={formatMoney(summary?.outstanding_fines)}
          icon={<CircleDollarSign className="h-5 w-5" />}
          accent="bg-rose-500/15 text-rose-500"
          sub={<Link href={`/${orgSlug}/fines`} className="text-primary hover:underline">View fines</Link>}
        />
        <StatCard
          label="Titles · Copies"
          value={`${(summary?.total_titles ?? 0).toLocaleString()} · ${(summary?.total_copies ?? 0).toLocaleString()}`}
          icon={<BookText className="h-5 w-5" />}
          sub={`${(summary?.available_copies ?? 0).toLocaleString()} available`}
        />
        <StatCard
          label="Pending Holds"
          value={(summary?.holds_pending ?? 0).toLocaleString()}
          icon={<BookMarked className="h-5 w-5" />}
          accent="bg-amber-500/15 text-amber-500"
          sub={<Link href={`/${orgSlug}/holds`} className="text-primary hover:underline">Manage holds</Link>}
        />
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <Card className="lg:col-span-2 p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">Circulation — last 14 days</h2>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={summary?.circulation_trend ?? []} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gCheckout" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7c3aed" stopOpacity={0.35} /><stop offset="95%" stopColor="#7c3aed" stopOpacity={0} /></linearGradient>
                <linearGradient id="gReturn" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} /><stop offset="95%" stopColor="#06b6d4" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d: string) => d.slice(5)} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', fontSize: 12 }} />
              <Area type="monotone" dataKey="checkouts" name="Checkouts" stroke="#7c3aed" fill="url(#gCheckout)" strokeWidth={2} />
              <Area type="monotone" dataKey="returns" name="Returns" stroke="#06b6d4" fill="url(#gReturn)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">Collection availability</h2>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Available', value: summary?.available_copies ?? 0 },
                  { name: 'On loan / other', value: Math.max(0, (summary?.total_copies ?? 0) - (summary?.available_copies ?? 0)) },
                ]}
                dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}
              >
                <Cell fill="#10b981" /><Cell fill="#f59e0b" />
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <p className="text-center text-xs text-muted-foreground">{(summary?.available_copies ?? 0).toLocaleString()} of {(summary?.total_copies ?? 0).toLocaleString()} copies available</p>
        </Card>
      </div>

      {/* Most borrowed bar chart */}
      {(popular?.data?.length ?? 0) > 0 && (
        <Card className="p-5 mt-4">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">Top titles by loans (30 days)</h2>
          <ResponsiveContainer width="100%" height={Math.max(160, (popular?.data?.length ?? 0) * 34)}>
            <BarChart data={(popular?.data ?? []).map((t) => ({ name: t.title?.slice(0, 28) || 'Untitled', loans: t.loans }))} layout="vertical" margin={{ left: 8, right: 16 }}>
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', fontSize: 12 }} />
              <Bar dataKey="loans" radius={[0, 6, 6, 0]}>
                {(popular?.data ?? []).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Quick actions */}
      <h2 className="mt-8 mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Quick Actions</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {QUICK_ACTIONS.map(({ label, href, icon: Icon, desc }) => (
          <Link
            key={href}
            href={`/${orgSlug}${href}`}
            className="group rounded-2xl border border-border bg-card p-5 shadow-sm hover:border-primary/40 hover:shadow-md transition-all"
          >
            <div className="h-11 w-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Icon className="h-5 w-5" />
            </div>
            <p className="font-semibold text-foreground flex items-center gap-1">
              {label}
              <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
          </Link>
        ))}
      </div>

      {/* Popular titles */}
      <h2 className="mt-8 mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Most Borrowed (30 days)</h2>
      <Card>
        {(popular?.data?.length ?? 0) === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No circulation data yet.</div>
        ) : (
          <ul className="divide-y divide-border">
            {popular!.data.map((t, i) => (
              <li key={t.id} className="flex items-center gap-4 px-5 py-3">
                <span className="h-7 w-7 shrink-0 rounded-lg bg-accent flex items-center justify-center text-xs font-bold text-muted-foreground">{i + 1}</span>
                <Link href={`/${orgSlug}/catalog/${t.id}`} className="flex-1 min-w-0 truncate font-medium hover:text-primary transition-colors">{t.title}</Link>
                <span className="text-sm text-muted-foreground shrink-0">{t.loans.toLocaleString()} loans</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <Tablet className="h-5 w-5 text-primary shrink-0" />
        <p className="text-sm text-muted-foreground flex-1">Offer digital lending to your members.</p>
        <Link href={`/${orgSlug}/ebooks`} className="text-sm font-semibold text-primary hover:underline">Open eBooks shelf</Link>
      </div>
    </div>
  );
}
