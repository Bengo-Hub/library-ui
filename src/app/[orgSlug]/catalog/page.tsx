'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Library, Plus, Search, SlidersHorizontal, ScanLine, Eye, BookText, Pencil, Trash2 } from 'lucide-react';
import { useCatalogSearch, useCatalogFacets, useDeleteBib } from '@/hooks/useCatalog';
import { useDebounce } from '@/hooks/useDebounce';
import { BIB_FORMATS, type BibFormat, type BibRecord } from '@/lib/api/catalog';
import { PageHeader, EmptyState } from '@/components/ui/page';
import { Button, Badge } from '@/components/ui/base';
import { DataTable, type DataTableColumn, type BulkAction } from '@bengo-hub/shared-ui-lib/data-table';
import { CapsuleTabs } from '@/components/ui/tabs';
import { Dialog } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AvailabilityBadge } from '@/components/library/AvailabilityBadge';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { FeatureLock } from '@bengo-hub/shared-ui-lib/subscription';
import { useImagePreview, ImagePreview } from '@bengo-hub/shared-ui-lib';
import { Can } from '@/components/auth/Can';
import { usePermissions } from '@/hooks/usePermissions';
import { apiErrorMessage } from '@/lib/api/error-message';

const PAGE_SIZE = 20;

function CatalogContent() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const router = useRouter();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams?.get('q') ?? '');
  const [format, setFormat] = useState<BibFormat | ''>('');
  const [subjectId, setSubjectId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [scanOpen, setScanOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toDelete, setToDelete] = useState<BibRecord | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const debouncedQ = useDebounce(q, 350);
  const { openPreview, previewProps } = useImagePreview();
  const { can } = usePermissions();
  const canDelete = can('library.catalog.delete');
  const deleteBib = useDeleteBib(orgSlug);

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
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await deleteBib.mutateAsync(toDelete.id);
      toast.success('Title deleted');
    } catch (e) {
      toast.error(await apiErrorMessage(e, 'Failed to delete title'));
    } finally {
      setToDelete(null);
    }
  }

  async function confirmBulkDelete(ids: string[]) {
    const results = await Promise.allSettled(ids.map((id) => deleteBib.mutateAsync(id)));
    const failed = results.filter((r) => r.status === 'rejected').length;
    setSelected(new Set());
    setBulkDeleteOpen(false);
    if (failed > 0) toast.error(`${failed} of ${ids.length} titles could not be deleted`);
    else toast.success(`${ids.length} title${ids.length === 1 ? '' : 's'} deleted`);
  }

  const bulkActions: BulkAction[] = canDelete
    ? [{
        key: 'delete', label: 'Delete', icon: <Trash2 className="h-4 w-4" />, variant: 'destructive',
        onClick: () => setBulkDeleteOpen(true),
      }]
    : [];

  // No cover image is ever rendered inline in this table — at 20+ rows/page, eagerly loading
  // that many full-size (or even thumbnail) images was real memory/bandwidth pressure. "View
  // cover" loads a cover on demand into the shared ImagePreview modal instead.
  const columns: DataTableColumn<BibRecord>[] = [
    {
      key: 'cover', header: '', align: 'center', exportable: false, sortable: false,
      render: (bib) => (
        <button
          type="button"
          title={bib.cover_url || bib.cover_back_url ? 'View cover' : 'No cover uploaded'}
          aria-label="View cover"
          disabled={!bib.cover_url && !bib.cover_back_url}
          onClick={(e) => {
            e.stopPropagation();
            openPreview({
              src: bib.cover_url ?? bib.cover_back_url ?? '',
              secondarySrc: bib.cover_url ? bib.cover_back_url : undefined,
              title: bib.title,
            });
          }}
          className="h-9 w-9 flex items-center justify-center rounded-lg border border-border text-muted-foreground enabled:hover:text-foreground enabled:hover:border-primary/40 transition-colors disabled:opacity-30"
        >
          {bib.cover_url || bib.cover_back_url ? <Eye className="h-4 w-4" /> : <BookText className="h-4 w-4" />}
        </button>
      ),
    },
    {
      key: 'title', header: 'Title', primary: true, sortable: true,
      accessor: (bib) => bib.title,
      render: (bib) => (
        <>
          <Link href={`/${orgSlug}/catalog/${bib.id}`} className="font-medium hover:text-primary line-clamp-1">{bib.title}</Link>
          {bib.author && <p className="text-xs text-muted-foreground truncate">{bib.author}</p>}
        </>
      ),
    },
    {
      key: 'format', header: 'Format', filterable: true,
      accessor: (bib) => bib.format,
      render: (bib) => <Badge variant="outline">{BIB_FORMATS.find((f) => f.value === bib.format)?.label ?? bib.format}</Badge>,
    },
    {
      key: 'isbn', header: 'ISBN', accessor: (bib) => bib.isbn ?? '',
      render: (bib) => <span className="font-mono text-xs">{bib.isbn ?? '—'}</span>,
    },
    {
      key: 'availability', header: 'Availability', sortable: true,
      accessor: (bib) => bib.available_copies ?? 0,
      render: (bib) => <AvailabilityBadge bib={bib} />,
    },
    {
      key: 'actions', header: '', align: 'right', exportable: false, sortable: false, mobileAction: true,
      render: (bib) => (
        <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
          <Can perm="library.catalog.change">
            <Link href={`/${orgSlug}/cataloging?id=${bib.id}`}>
              <Button variant="ghost" size="icon" title="Edit"><Pencil className="h-4 w-4" /></Button>
            </Link>
          </Can>
          <Can perm="library.catalog.delete">
            <Button variant="ghost" size="icon" title="Delete" onClick={() => setToDelete(bib)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </Can>
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Catalog"
        subtitle="Public access catalog (OPAC)"
        icon={<Library className="h-5 w-5" />}
        actions={
          <Can perm="library.catalog.add">
            <FeatureLock feature="library_catalog" mode="block">
              <Link href={`/${orgSlug}/cataloging`}>
                <Button className="gap-1.5"><Plus className="h-4 w-4" /> Add Title</Button>
              </Link>
            </FeatureLock>
          </Can>
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
            className="w-full h-11 rounded-xl border border-input bg-card pl-10 pr-16 text-sm focus:ring-1 focus:ring-ring focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setScanOpen(true)}
            title="Scan ISBN/barcode to search"
            aria-label="Scan ISBN/barcode to search"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <ScanLine className="h-4 w-4" />
          </button>
        </div>
        {isFetching && <span className="text-xs text-muted-foreground">Searching…</span>}
      </div>

      <Dialog open={scanOpen} onClose={() => setScanOpen(false)} title="Scan ISBN or barcode">
        {scanOpen && (
          <BarcodeScanner
            hint="Point the camera at the ISBN or copy barcode to search the catalog."
            onScan={(text) => { setQ(text); setScanOpen(false); }}
          />
        )}
      </Dialog>

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

      <DataTable
        columns={columns}
        rows={bibs}
        rowKey={(bib) => bib.id}
        loading={isLoading}
        loadingRows={8}
        onRowClick={(bib) => router.push(`/${orgSlug}/catalog/${bib.id}`)}
        emptyState={
          <EmptyState
            icon={<Library className="h-12 w-12" />}
            title="No titles found"
            description={debouncedQ ? `Nothing matched "${debouncedQ}".` : 'Your catalog is empty. Start by cataloging a title.'}
            action={<Link href={`/${orgSlug}/cataloging`}><Button className="gap-1.5"><Plus className="h-4 w-4" /> Add Title</Button></Link>}
          />
        }
        storageKey="library-catalog"
        selectable={canDelete}
        selected={selected}
        onSelectedChange={setSelected}
        bulkActions={bulkActions}
        showExportCsv
        exportFileName="library-catalog"
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        total={total}
      />

      <ImagePreview {...previewProps} />

      <ConfirmDialog
        open={!!toDelete}
        title="Delete this title?"
        description={`Permanently remove "${toDelete?.title ?? ''}" from the catalog. Blocked if copies or active loans still reference it.`}
        variant="danger"
        confirmLabel="Delete title"
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        title={`Delete ${selected.size} title${selected.size === 1 ? '' : 's'}?`}
        description="Permanently remove the selected titles from the catalog. Any that still have copies or active loans will fail and be reported."
        variant="danger"
        confirmLabel="Delete selected"
        onConfirm={() => confirmBulkDelete(Array.from(selected))}
        onCancel={() => setBulkDeleteOpen(false)}
      />
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
