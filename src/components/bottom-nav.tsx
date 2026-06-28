'use client';

import { cn } from '@/lib/utils';
import { BookOpen, Library, LayoutDashboard, Menu, Users } from 'lucide-react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';

/**
 * Native-app-style bottom tab bar shown only on phones (hidden on lg+ where the sidebar is
 * persistent). Holds the 5 highest-traffic destinations (Material `bottom-nav-limit` ≤ 5,
 * icon + label, active highlight); everything else lives behind "More", which opens the full
 * sidebar drawer. Sits above the safe-area gesture bar via env(safe-area-inset-bottom).
 */

interface BottomNavProps {
  onMore?: () => void;
}

interface Tab {
  label: string;
  icon: React.ElementType;
  href: string;
  /** active when pathname starts with this (after the orgSlug). '' = dashboard root. */
  match: string;
}

const TABS: Tab[] = [
  { label: 'Home', icon: LayoutDashboard, href: '', match: '' },
  { label: 'Catalog', icon: Library, href: '/catalog', match: '/catalog' },
  { label: 'Desk', icon: BookOpen, href: '/circulation', match: '/circulation' },
  { label: 'Members', icon: Users, href: '/members', match: '/members' },
];

export function BottomNav({ onMore }: BottomNavProps) {
  const params = useParams();
  const pathname = usePathname() ?? '';
  const orgSlug = (params?.orgSlug as string) || '';
  const base = `/${orgSlug}`;

  function isActive(match: string) {
    if (match === '') return pathname === base;
    return pathname.startsWith(`${base}${match}`);
  }

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-lg"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Primary"
    >
      <div className="grid grid-cols-5 h-16">
        {TABS.map(({ label, icon: Icon, href, match }) => {
          const active = isActive(match);
          return (
            <Link
              key={label}
              href={`${base}${href}`}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors',
                'min-h-[44px] active:bg-accent/60',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span className={cn('relative flex items-center justify-center', active && 'after:absolute after:-top-2 after:h-1 after:w-6 after:rounded-full after:bg-primary')}>
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
              </span>
              {label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onMore}
          aria-label="More menu"
          className="flex flex-col items-center justify-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors min-h-[44px] active:bg-accent/60"
        >
          <Menu className="h-5 w-5" strokeWidth={2} />
          More
        </button>
      </div>
    </nav>
  );
}
