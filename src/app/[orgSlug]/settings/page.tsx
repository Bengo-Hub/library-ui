'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Settings, Library, Users, ListChecks, BarChart3, BookOpen, CalendarDays, Hash, Scale, ChevronRight, Printer } from 'lucide-react';
import { PageHeader } from '@/components/ui/page';
import { Card } from '@/components/ui/base';
import { useBranding } from '@/providers/branding-provider';
import { useMe } from '@/hooks/useMe';

export default function SettingsPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const { tenant } = useBranding();
  const { user } = useMe();

  const links = [
    { label: 'Branches', href: '/settings/branches', icon: Library, desc: 'Manage library branches' },
    { label: 'Circulation Rules', href: '/settings/circulation-rules', icon: Scale, desc: '3D matrix: Branch × Tier × Format' },
    { label: 'Holiday Calendar', href: '/settings/calendar', icon: CalendarDays, desc: 'Closure days for due-date calculation' },
    { label: 'Authorized Values', href: '/settings/authorized-values', icon: BookOpen, desc: 'Shelving locations, item statuses, payment types' },
    { label: 'Member Tiers', href: '/members/tiers', icon: ListChecks, desc: 'Borrowing entitlements' },
    { label: 'Loan Policies', href: '/members/policies', icon: ListChecks, desc: 'Loan periods & fine rules' },
    { label: 'Numbering & Sequences', href: '/settings/sequences', icon: Hash, desc: 'Membership & accession number formats' },
    { label: 'Printing', href: '/settings/printing', icon: Printer, desc: 'Print agent status & default label printer' },
    { label: 'Team & Roles', href: '/team', icon: Users, desc: 'Staff and permissions' },
    { label: 'Reports', href: '/reports', icon: BarChart3, desc: 'Circulation & collection reports' },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader title="Settings" subtitle="Configure your library" icon={<Settings className="h-5 w-5" />} />

      <Card className="mb-6">
        <div className="p-6 flex items-center gap-4">
          {tenant?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tenant.logoUrl} alt={tenant.name ?? orgSlug} className="h-14 w-14 rounded-xl object-contain bg-muted p-1" />
          ) : (
            <div className="h-14 w-14 rounded-xl bg-primary/15 text-primary flex items-center justify-center"><Library className="h-7 w-7" /></div>
          )}
          <div>
            <p className="text-lg font-bold">{tenant?.orgName ?? tenant?.name ?? orgSlug}</p>
            <p className="text-sm text-muted-foreground">Signed in as {user?.email ?? '—'}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {links.map(({ label, href, icon: Icon, desc }) => (
          <Link key={href} href={`/${orgSlug}${href}`} className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm hover:border-primary/40 hover:shadow-md transition-all">
            <div className="h-11 w-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center"><Icon className="h-5 w-5" /></div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
}
