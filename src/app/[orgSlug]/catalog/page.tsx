'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Library, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { useCatalogSearch, useCatalogFacets } from '@/hooks/useCatalog';
import { useDebounce } from '@/hooks/useDebounce';
import { BIB_FORMATS, type BibFormat } from '@/lib/api/catalog';
import { PageHeader, EmptyState, Skeleton } from '@/components/ui/page';
import { Button } from '@/components/ui/base';
import { Pagination } from '@/components/ui/pagination';
import { CapsuleTabs } from '@/components/ui/tabs';
import { AvailabilityBadge } from '@/components/library/AvailabilityBadge';
import { CoverThumb } from '@/components/library/CoverThumb';

const PAGE_SIZE = 18;

function CatalogContent() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams?.get('q') ?? '');
  const [format, setFormat] = useState<BibFormat | ''>('');
  const [subjectId, setSubjectId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [page, setPage] = useState(1);
  const debouncedQ = useDebounce(q, 350);

  useEffect(() => { setPage(1); }, [debouncedQ, format, subjectId, branchId, availableOnly]);

  const { data: facets } = useCatalogFacets(orgSlug);
  const { data, isLoading, isFetching } = useCatalogSearch(orgSlug, debouncedQ, {
    format: format || undefined,
    subject_id: subjectId || undefined,
    branch_id: branchId || undefined,
    available: availableOnly || undefined,
    page,
    limit: PAGE_SIZE,
  });

  const bibs = data?.data ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Catalog"
        subtitle="Public access catalog (OPAC)"
        icon={<Library className="h-5 w-5" />}
        actions={
          <Link href={`/${orgSlug}/cataloging`}>
            <Button className="gap-1.5"><Plus className="h-4 w-4" /> Add Title</Button>
          </Link>
        }
      />

      {/* Search + format filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by title, author, ISBN, subject…"
            className="w-full h-11 rounded-xl border border-input bg-card pl-10 pr-4 text-sm focus:ring-1 focus:ring-ring focus:outline-none"
          />
        </div>
        {isFetching && <span className="text-xs text-muted-foreground">Searching…</span>}
      </div>

      <CapsuleTabs
        className="mb-3"
        value={format || 'all'}
        onChange={(v) => setFormat(v === 'all' ? '' : (v as BibFormat))}
        options={[{ value: 'all', label: 'All' }, ...BIB_FORMATS.map((f) => ({ value: f.value, label: f.label }))]}
      />

      {/* Facets: subject / branch / availability */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><SlidersHorizontal className="h-3.5 w-3.5" /> Filters</span>
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className="h-9 rounded-lg border border-input bg-card px-2.5 text-xs focus:ring-1 focus:ring-ring focus:outline-none"
          aria-label="Filter by subject"
        >
          <option value="">All subjects</option>
          {facets?.subjects?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          className="h-9 rounded-lg border border-input bg-card px-2.5 text-xs focus:ring-1 focus:ring-ring focus:outline-none"
          aria-label="Filter by branch"
        >
          <option value="">All branches</option>
          {facets?.branches?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <button
          type="button"
          onClick={() => setAvailableOnly((v) => !v)}
          aria-pressed={availableOnly}
          className={`h-9 rounded-lg border px-3 text-xs font-medium transition-colors ${availableOnly ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-card text-muted-foreground hover:text-foreground'}`}
        >
          Available only
        </button>
        {(subjectId || branchId || availableOnly) && (
          <button type="button" onClick={() => { setSubjectId(''); setBranchId(''); setAvailableOnly(false); }} className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground">Clear</button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
        </div>
      ) : bibs.length === 0 ? (
        <EmptyState
          icon={<Library className="h-12 w-12" />}
          title="No titles found"
          description={debouncedQ ? `Nothing matched "${debouncedQ}".` : 'Your catalog is empty. Start by cataloging a title.'}
          action={<Link href={`/${orgSlug}/cataloging`}><Button className="gap-1.5"><Plus className="h-4 w-4" /> Add Title</Button></Link>}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {bibs.map((bib) => (
            <Link
              key={bib.id}
              href={`/${orgSlug}/catalog/${bib.id}`}
              className="group rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:border-primary/40 hover:shadow-md transition-all"
            >
              <CoverThumb url={bib.cover_url} title={bib.title} className="aspect-[3/4] w-full" />
              <div className="p-3 space-y-1.5">
                <p className="text-sm font-semibold leading-tight line-clamp-2 group-hover:text-primary transition-colors">{bib.title}</p>
                {bib.author && <p className="text-xs text-muted-foreground truncate">{bib.author}</p>}
                <AvailabilityBadge bib={bib} />
              </div>
            </Link>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

export default function CatalogPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading catalog…</div>}>
      <CatalogContent />
    </Suspense>
  );
}
