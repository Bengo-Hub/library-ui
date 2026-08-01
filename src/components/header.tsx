'use client';

import { useAuthStore } from '@/store/auth';
import { useState } from 'react';
import { Bell, BookOpen, ChevronDown, CreditCard, ExternalLink, LogOut, Menu, Search, Settings, ShoppingCart, User } from 'lucide-react';
import { toast } from 'sonner';
import { ThemeToggle } from './theme-toggle';
import { useBranding } from '@/providers/branding-provider';
import { usePermissions } from '@/hooks/usePermissions';
import { pinApi } from '@/lib/api/pin';
import { useDocumentPreview, PdfPreview } from '@bengo-hub/shared-ui-lib';
import { useVisibleServices, type ServiceKey } from '@bengo-hub/shared-ui-lib/app-switcher';
import { BranchFilter } from './branch-filter';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';

// library-ui links to only a curated subset of the shared registry (librarians don't need
// Logistics/CRM/ERP shortcuts) via `include` — POS and Treasury stay local since library-ui was
// already linking to them before the shared registry existed and neither is in scope to
// generalize this session.
const POS_URL = process.env.NEXT_PUBLIC_POS_UI_URL ?? 'https://pos.codevertexafrica.com';
const TREASURY_URL = process.env.NEXT_PUBLIC_TREASURY_UI_URL ?? 'https://books.codevertexafrica.com';
const LIBRARY_SERVICE_KEYS: ServiceKey[] = [
  'subscriptions',
  'auth',
  'projects',
  'afya',
  'sourcing',
  'traceability',
  'ticketing',
];
const SERVICE_URLS: Partial<Record<ServiceKey, string>> = {
  subscriptions: process.env.NEXT_PUBLIC_SUBSCRIPTIONS_UI_URL ?? 'https://pricing.codevertexafrica.com',
  auth: process.env.NEXT_PUBLIC_AUTH_UI_URL ?? 'https://accounts.codevertexafrica.com',
  projects: process.env.NEXT_PUBLIC_PROJECTS_UI_URL ?? 'https://projects.codevertexafrica.com',
  afya: process.env.NEXT_PUBLIC_HOSPITAL_UI_URL ?? 'https://afya.codevertexafrica.com',
};

function displayName(user: { fullName?: string; name?: string; email?: string } | null): string {
  if (!user) return 'Account';
  return user.fullName ?? user.name ?? user.email?.split('@')[0] ?? 'Account';
}

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const params = useParams();
  const router = useRouter();
  const orgSlug = (params?.orgSlug as string) || 'codevertex';
  const user = useAuthStore((state) => state.user);
  const session = useAuthStore((state) => state.session);
  const logout = useAuthStore((state) => state.logout);
  const { getServiceTitle } = useBranding();
  const { can } = usePermissions();
  const [profileOpen, setProfileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const isAuthenticated = !!user && !!session;
  const name = displayName(user);
  const role = user?.roles?.[0];

  // No RBAC/subscription gating today (matches prior behavior); activeServiceTags omitted (fails open).
  const services = useVisibleServices({
    orgSlug,
    urls: SERVICE_URLS,
    canManageLinks: true,
    include: LIBRARY_SERVICE_KEYS,
  });

  const { openPreview, previewProps } = useDocumentPreview({ onError: (m: string) => toast.error(m) });
  function downloadMyCard() {
    setProfileOpen(false);
    void openPreview(() => pinApi.myCardPdf(orgSlug), { fileName: 'my-staff-card.pdf', title: 'My staff card', orientation: 'landscape' });
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = search.trim();
    setSearchOpen(false);
    router.push(`/${orgSlug}/catalog${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  }

  return (
    <>
    <header className="h-16 sm:h-20 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-30 px-3 sm:px-8 flex items-center justify-between">
      <div className="flex items-center gap-4 flex-1">
        <button
          type="button"
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-xl hover:bg-accent transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5 text-muted-foreground" />
        </button>
        <div className="flex items-center gap-2 sm:gap-6 min-w-0">
          <h1 className="text-lg sm:text-xl font-black tracking-tight text-foreground uppercase truncate max-w-[110px] sm:max-w-none">
            {getServiceTitle('Library')}
          </h1>
          <form onSubmit={submitSearch} className="hidden md:flex relative w-80 max-w-full group ml-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search the catalog (OPAC)…"
              className="w-full h-10 bg-accent/50 border-none rounded-xl py-1.5 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary/30 transition-all outline-none"
            />
          </form>
          <BranchFilter className="block shrink-0" />
        </div>
      </div>

      <div className="flex items-center gap-0.5 sm:gap-3">
        <button
          type="button"
          onClick={() => setSearchOpen((v) => !v)}
          className="md:hidden p-2.5 rounded-xl hover:bg-accent transition-all"
          aria-label="Search catalog"
          aria-expanded={searchOpen}
        >
          <Search className="h-5 w-5 text-muted-foreground" />
        </button>

        <button className="relative group p-2.5 rounded-xl hover:bg-accent transition-all">
          <Bell className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-background" />
        </button>

        <ThemeToggle />

        <div className="h-8 w-[1px] bg-border mx-1 hidden sm:block" />

        {isAuthenticated && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen((v) => !v)}
              className="flex items-center gap-3 rounded-2xl hover:bg-accent p-1 transition-all group"
              aria-expanded={profileOpen}
              aria-haspopup="true"
              aria-label="Open profile menu"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shadow-sm transition-transform group-hover:scale-105">
                {name[0]?.toUpperCase() ?? <User className="h-5 w-5" />}
              </div>
              <div className="hidden md:block text-left mr-1">
                <p className="text-xs font-black text-foreground truncate max-w-[120px]">{name}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{role || 'Librarian'}</p>
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${profileOpen ? 'rotate-180' : ''}`} />
            </button>

            {profileOpen && (
              <>
                <div className="fixed inset-0 z-40" aria-hidden="true" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-[1.5rem] p-3 shadow-2xl border border-border bg-popover overflow-hidden">
                  <div className="mb-2 px-3 py-2">
                    <p className="text-sm font-black text-foreground">{name}</p>
                    <p className="text-[10px] text-muted-foreground truncate font-bold uppercase tracking-widest mt-0.5">{role || 'Librarian'}</p>
                  </div>

                  <div className="h-px bg-border my-2 mx-1" />
                  <button
                    type="button"
                    onClick={downloadMyCard}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-foreground/70 hover:bg-accent hover:text-foreground transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center group-hover:text-primary transition-colors">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    My staff card
                  </button>

                  {can('library.settings.manage') && (
                    <>
                      <div className="h-px bg-border my-2 mx-1" />
                      <div className="grid gap-1">
                        <Link
                          href={`/${orgSlug}/settings`}
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-foreground/70 hover:bg-accent hover:text-foreground transition-all group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center group-hover:text-primary transition-colors">
                            <Settings className="h-4 w-4" />
                          </div>
                          Settings
                        </Link>
                      </div>
                    </>
                  )}

                  <div className="h-px bg-border my-2 mx-1" />

                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-3 mb-1.5">Services</p>
                  <div className="grid gap-1">
                    <a
                      href={`${POS_URL}/${orgSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-foreground/70 hover:bg-accent hover:text-foreground transition-all group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center group-hover:text-primary transition-colors">
                        <ShoppingCart className="h-4 w-4" />
                      </div>
                      <span className="flex-1">POS</span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground opacity-60" />
                    </a>
                    <a
                      href={`${TREASURY_URL}/${orgSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-foreground/70 hover:bg-accent hover:text-foreground transition-all group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center group-hover:text-primary transition-colors">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <span className="flex-1">Treasury</span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground opacity-60" />
                    </a>
                    {services.map(({ key, label, href, Icon }) =>
                      href ? (
                        <a
                          key={key}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-foreground/70 hover:bg-accent hover:text-foreground transition-all group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center group-hover:text-primary transition-colors">
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="flex-1">{label}</span>
                          <ExternalLink className="h-3 w-3 text-muted-foreground opacity-60" />
                        </a>
                      ) : (
                        <div
                          key={key}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-muted-foreground/50 cursor-default"
                          title={`${label} — coming soon`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="flex-1">{label}</span>
                          <span className="text-[9px] font-bold uppercase tracking-wider bg-accent px-1.5 py-0.5 rounded-full">Soon</span>
                        </div>
                      ),
                    )}
                  </div>

                  <div className="h-px bg-border my-2 mx-1" />

                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      void logout();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-rose-600 hover:bg-rose-500/10 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center transition-colors">
                      <LogOut className="h-4 w-4" />
                    </div>
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Mobile expandable search — slides under the bar so the catalog (OPAC) is reachable on phones. */}
      {searchOpen && (
        <form
          onSubmit={submitSearch}
          className="md:hidden absolute left-0 right-0 top-full px-3 pb-3 pt-2 bg-background/95 backdrop-blur-md border-b border-border animate-fade-up"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search the catalog (OPAC)…"
              className="w-full h-11 bg-accent/50 border-none rounded-xl pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary/30 outline-none"
            />
          </div>
        </form>
      )}
    </header>
    <PdfPreview {...previewProps} />
    </>
  );
}
