'use client';

import { cn } from '@/lib/utils';
import {
  ArrowLeftRight,
  BarChart3,
  BookCopy,
  BookMarked,
  BookOpen,
  BookText,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  LayoutDashboard,
  Library,
  ListChecks,
  LogOut,
  ScanLine,
  Settings,
  Shield,
  Tablet,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useState } from 'react';
import { useBranding } from '@/providers/branding-provider';
import { useAuthStore } from '@/store/auth';
import { isPlatformOwner as checkPlatformOwner } from '@/lib/auth/permissions';
import { useOutletStore } from '@/store/outlet';

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
}

interface NavGroup {
  label: string;
  defaultCollapsed?: boolean;
  items: NavItem[];
}

function NavLink({ item, orgSlug, onClose }: { item: NavItem; orgSlug: string; onClose?: () => void }) {
  const pathname = usePathname();
  const href = `/${orgSlug}${item.href}`;
  const active = item.href === '' ? pathname === `/${orgSlug}` : pathname.startsWith(href);
  const Icon = item.icon;

  return (
    <Link
      href={href}
      onClick={onClose}
      className={cn(
        'group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm',
        active
          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 font-semibold'
          : 'text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-foreground/8 font-medium'
      )}
    >
      <Icon className={cn('h-4.5 w-4.5 shrink-0 transition-transform duration-200', !active && 'group-hover:scale-110')} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function NavGroupSection({
  group, orgSlug, onClose, initialOpen,
}: {
  group: NavGroup; orgSlug: string; onClose?: () => void; initialOpen: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 mb-1 py-0.5 group/header"
        aria-expanded={open}
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-sidebar-foreground/25 group-hover/header:text-sidebar-foreground/40 transition-colors">
          {group.label}
        </span>
        <ChevronDown
          className={cn(
            'h-3 w-3 text-sidebar-foreground/20 transition-all duration-200 group-hover/header:text-sidebar-foreground/40',
            open && 'rotate-180'
          )}
        />
      </button>
      {open && (
        <div className="space-y-0.5">
          {group.items.map((item) => (
            <NavLink key={item.href + item.label} item={item} orgSlug={orgSlug} onClose={onClose} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const params = useParams();
  const pathname = usePathname();
  const orgSlug = params?.orgSlug as string;
  const { tenant } = useBranding();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const { outlet, clearOutlet } = useOutletStore();
  const isPlatformOwner = checkPlatformOwner(user);

  async function handleLogout() {
    clearOutlet();
    await logout();
  }

  const navGroups: NavGroup[] = [
    {
      label: 'Overview',
      items: [
        { label: 'Dashboard', icon: LayoutDashboard, href: '' },
      ],
    },
    {
      label: 'Catalog',
      items: [
        { label: 'Catalog (OPAC)', icon: Library, href: '/catalog' },
        { label: 'Cataloging', icon: BookText, href: '/cataloging' },
        { label: 'Copies & Holdings', icon: BookCopy, href: '/copies' },
        { label: 'eBooks', icon: Tablet, href: '/ebooks' },
      ],
    },
    {
      label: 'Circulation',
      items: [
        { label: 'Circulation Desk', icon: BookOpen, href: '/circulation' },
        { label: 'Self-Checkout', icon: ScanLine, href: '/kiosk' },
        { label: 'Holds', icon: BookMarked, href: '/holds' },
        { label: 'Fines', icon: CircleDollarSign, href: '/fines' },
      ],
    },
    {
      label: 'Patrons',
      items: [
        { label: 'Members', icon: Users, href: '/members' },
        { label: 'Member Tiers', icon: ListChecks, href: '/members/tiers' },
        { label: 'Loan Policies', icon: ListChecks, href: '/members/policies' },
      ],
    },
    {
      label: 'Management',
      defaultCollapsed: true,
      items: [
        { label: 'Stocktake', icon: ClipboardCheck, href: '/stocktake' },
        { label: 'Branch Transfers', icon: ArrowLeftRight, href: '/transfers' },
        { label: 'Reports', icon: BarChart3, href: '/reports' },
        { label: 'Branches', icon: Library, href: '/settings/branches' },
        { label: 'Team & Roles', icon: Users, href: '/team' },
        { label: 'Settings', icon: Settings, href: '/settings' },
      ],
    },
  ];

  function isGroupInitiallyOpen(group: NavGroup): boolean {
    if (!group.defaultCollapsed) return true;
    return group.items.some((item) => {
      const href = `/${orgSlug}${item.href}`;
      return item.href === '' ? pathname === `/${orgSlug}` : pathname?.startsWith(href);
    });
  }

  const displayName = user?.fullName || tenant?.orgName || orgSlug;
  const displayInitial = displayName?.[0]?.toUpperCase() ?? '?';

  const content = (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      <div className="border-b border-sidebar-border shrink-0 overflow-hidden" style={{ height: '72px' }}>
        {tenant?.logoUrl ? (
          <div className="flex items-center h-full px-3 py-2">
            <img src={tenant.logoUrl} alt={tenant.name ?? orgSlug} className="h-full w-auto max-w-full object-contain" />
          </div>
        ) : (
          <div className="flex items-center gap-3 h-full px-4">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <span className="text-sm font-bold text-primary-foreground">
                {(tenant?.orgName ?? orgSlug).slice(0, 2).toUpperCase()}
              </span>
            </div>
            <span className="text-sm font-bold text-sidebar-foreground truncate">
              {tenant?.orgName ?? orgSlug}
            </span>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-hide">
        {navGroups.map((group) => (
          <NavGroupSection
            key={group.label}
            group={group}
            orgSlug={orgSlug}
            onClose={onClose}
            initialOpen={isGroupInitiallyOpen(group)}
          />
        ))}

        {isPlatformOwner && (
          <div>
            <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-sidebar-foreground/25">
              Platform
            </p>
            <div className="space-y-0.5">
              <NavLink item={{ label: 'Platform Admin', icon: Shield, href: '/platform' }} orgSlug={orgSlug} onClose={onClose} />
            </div>
          </div>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-sidebar-foreground/5">
          <div className="h-8 w-8 rounded-lg bg-primary/25 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-primary">{displayInitial}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-sidebar-foreground truncate">{displayName}</p>
            <p className="text-[10px] text-sidebar-foreground/40 mt-0.5">{outlet?.name ?? 'Library'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-sidebar-foreground/35 hover:text-rose-400 hover:bg-sidebar-foreground/8 transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col transition-transform duration-300',
          'lg:static lg:inset-auto lg:h-full lg:z-auto lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4 lg:hidden bg-sidebar">
          <span className="text-sm font-semibold text-sidebar-foreground">Menu</span>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-foreground/10 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">{content}</div>
      </aside>
    </>
  );
}
