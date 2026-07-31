'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { BookCopy, Plus, Printer, Pencil, Trash2, ArrowLeft, Search, ScanLine } from 'lucide-react';
import { useBib } from '@/hooks/useCatalog';
import { useBibCopies, useCopies, useCreateCopy, useUpdateCopy, useDeleteCopy } from '@/hooks/useCopies';
import { useBranches } from '@/hooks/useBranches';
import { PageHeader, EmptyState } from '@/components/ui/page';
import { Button, Badge } from '@/components/ui/base';
import { DataTable, type DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { CapsuleTabs } from '@/components/ui/tabs';
import { Select } from '@/components/ui/form';
import { Dialog } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Can } from '@/components/auth/Can';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { useDocumentPreview, PdfPreview } from '@bengo-hub/shared-ui-lib';
import { CopyFormDialog } from '@/components/library/CopyFormDialog';
import { copiesApi, COPY_STATUSES, type Copy, type CopyInput, type CopyStatus } from '@/lib/api/copies';
import { apiErrorMessage } from '@/lib/api/error-message';
import { formatDate } from '@/lib/format';

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'error' | 'outline'> = {
  available: 'success', on_loan: 'warning', on_hold: 'warning', in_transit: 'default',
  reference: 'outline', lost: 'error', damaged: 'error', withdrawn: 'outline',
};

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'available', label: 'Available' },
  { value: 'on_loan', label: 'On Loan' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'lost', label: 'Lost' },
  { value: 'damaged', label: 'Damaged' },
];

const PAGE_SIZE = 25;

function CopiesContent() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const searchParams = useSearchParams();
  const bibId = searchParams?.get('bib') ?? '';

  // Global holdings browser state
  const [statusFilter, setStatusFilter] = useState<CopyStatus | ''>('');
  const [branchFilter, setBranchFilter] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [page, setPage] = useState(1);
  const [scanOpen, setScanOpen] = useState(false);

  const { data: bib } = useBib(orgSlug, bibId);
  const { data: bibCopies = [], isLoading: bibLoading } = useBibCopies(orgSlug, bibId);
  const { data: copiesPage, isLoading: allLoading } = useCopies(orgSlug, !bibId ? {
    status: statusFilter || undefined,
    branch_id: branchFilter || undefined,
    q: searchQ || undefined,
    page,
    limit: PAGE_SIZE,
  } : undefined);
  const { data: branchesPage } = useBranches(orgSlug);

  const createCopy = useCreateCopy(orgSlug);
  const updateCopy = useUpdateCopy(orgSlug);
  const deleteCopy = useDeleteCopy(orgSlug);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Copy | undefined>();
  const [toWithdraw, setToWithdraw] = useState<Copy | null>(null);
  const { openPreview, previewProps } = useDocumentPreview({ onError: (m: string) => toast.error(m) });

  async function handleSubmit(data: CopyInput) {
    try {
      if (editing) {
        await updateCopy.mutateAsync({ id: editing.id, data });
        toast.success('Copy updated');
      } else {
        await createCopy.mutateAsync(data);
        toast.success('Copy added');
      }
      setDialogOpen(false);
      setEditing(undefined);
    } catch (e) {
      toast.error(await apiErrorMessage(e, 'Failed to save copy'));
    }
  }

  async function handleWithdraw() {
    if (!toWithdraw) return;
    try {
      await deleteCopy.mutateAsync(toWithdraw.id);
      toast.success('Copy withdrawn');
    } catch (e) {
      toast.error(await apiErrorMessage(e, 'Failed to withdraw copy'));
    } finally {
      setToWithdraw(null);
    }
  }

  function printLabel(copy: Copy) {
    void openPreview(() => copiesApi.labelPdf(orgSlug, copy.id), {
      fileName: `label-${copy.barcode}.pdf`, title: 'Spine / barcode label', orientation: 'landscape',
    });
  }

  if (!bibId) {
    const allCopies = copiesPage?.data ?? [];
    const total = copiesPage?.total ?? 0;
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const branches = branchesPage?.data ?? [];

    const globalColumns: DataTableColumn<Copy>[] = [
      {
        key: 'barcode', header: 'Accession / Barcode Number', primary: true, sortable: true,
        accessor: (c) => c.barcode,
        render: (c) => <span className="font-mono text-xs">{c.barcode}</span>,
      },
      {
        key: 'title', header: 'Title', accessor: (c) => c.bib_title ?? '',
        render: (c) => <span className="line-clamp-1 text-sm">{c.bib_title ?? '—'}</span>,
      },
      { key: 'branch', header: 'Branch', accessor: (c) => c.branch_name ?? '', render: (c) => c.branch_name ?? '—' },
      { key: 'shelf', header: 'Shelf', accessor: (c) => c.shelf_location ?? '', render: (c) => c.shelf_location ?? '—' },
      {
        key: 'acquired', header: 'Acquired', sortable: true, accessor: (c) => c.acquisition_date,
        render: (c) => <span className="text-muted-foreground text-xs">{formatDate(c.acquisition_date)}</span>,
      },
      {
        key: 'status', header: 'Status', accessor: (c) => c.status,
        render: (c) => <Badge variant={STATUS_VARIANT[c.status] ?? 'outline'}>{COPY_STATUSES.find((s) => s.value === c.status)?.label ?? c.status}</Badge>,
      },
      {
        key: 'actions', header: '', align: 'right', exportable: false, mobileAction: true,
        render: (c) => (
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" title="Print label" onClick={() => printLabel(c)}><Printer className="h-4 w-4" /></Button>
            <Can perm="library.copies.change">
              <Button variant="ghost" size="icon" title="Edit" onClick={() => { setEditing(c); setDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
            </Can>
            <Can perm="library.copies.delete">
              <Button variant="ghost" size="icon" title="Withdraw" onClick={() => setToWithdraw(c)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </Can>
          </div>
        ),
      },
    ];

    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <PageHeader
          title="Copies & Holdings"
          subtitle={`${total} physical cop${total === 1 ? 'y' : 'ies'} across all titles`}
          icon={<BookCopy className="h-5 w-5" />}
          actions={
            <Link href={`/${orgSlug}/catalog`}>
              <Button variant="outline" className="gap-1.5"><Plus className="h-4 w-4" /> Add via Catalog</Button>
            </Link>
          }
        />

        <CapsuleTabs
          options={STATUS_TABS}
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v as CopyStatus | ''); setPage(1); }}
        />

        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              value={searchQ}
              onChange={(e) => { setSearchQ(e.target.value); setPage(1); }}
              placeholder="Search accession/barcode number or title…"
              className="w-full rounded-lg border border-input bg-transparent pl-8 pr-9 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setScanOpen(true)}
              title="Scan accession/barcode number"
              aria-label="Scan accession/barcode number"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <ScanLine className="h-3.5 w-3.5" />
            </button>
          </div>
          {branches.length > 0 && (
            <Select
              value={branchFilter}
              onChange={(e) => { setBranchFilter(e.target.value); setPage(1); }}
              className="min-w-40"
            >
              <option value="">All branches</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          )}
        </div>

        <DataTable
          columns={globalColumns}
          rows={allCopies}
          rowKey={(c) => c.id}
          loading={allLoading}
          emptyState={
            <EmptyState
              icon={<BookCopy className="h-12 w-12" />}
              title="No copies found"
              description={searchQ || statusFilter || branchFilter ? 'Try adjusting the filters.' : 'No physical copies have been registered yet.'}
              action={
                <Link href={`/${orgSlug}/catalog`}><Button className="gap-1.5"><Plus className="h-4 w-4" /> Go to catalog</Button></Link>
              }
            />
          }
          storageKey="library-copies-holdings"
          showExportCsv
          exportFileName="library-copies"
        />

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Page {page} of {totalPages} ({total} total)</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}

        {editing && (
          <CopyFormDialog
            open={dialogOpen}
            orgSlug={orgSlug}
            bibId={editing.bib_record_id}
            initial={editing}
            saving={updateCopy.isPending}
            onSubmit={handleSubmit}
            onClose={() => { setDialogOpen(false); setEditing(undefined); }}
          />
        )}

        <ConfirmDialog
          open={!!toWithdraw}
          title="Withdraw this copy?"
          description={`Copy ${toWithdraw?.barcode} will be withdrawn from circulation. This is a sensitive action.`}
          variant="danger"
          confirmLabel="Withdraw copy"
          onConfirm={handleWithdraw}
          onCancel={() => setToWithdraw(null)}
        />

        <PdfPreview {...previewProps} />

        <Dialog open={scanOpen} onClose={() => setScanOpen(false)} title="Scan accession/barcode number">
          {scanOpen && (
            <BarcodeScanner
              hint="Point the camera at the copy's accession/barcode label."
              onScan={(text) => { setSearchQ(text); setPage(1); setScanOpen(false); }}
            />
          )}
        </Dialog>
      </div>
    );
  }

  const copies = bibCopies;
  const isLoading = bibLoading;

  const columns: DataTableColumn<Copy>[] = [
    {
      key: 'barcode', header: 'Accession / Barcode Number', primary: true,
      accessor: (c) => c.barcode,
      render: (c) => <span className="font-mono text-xs">{c.barcode}</span>,
    },
    { key: 'branch', header: 'Branch', accessor: (c) => c.branch_name ?? '', render: (c) => c.branch_name ?? '—' },
    { key: 'shelf', header: 'Shelf', accessor: (c) => c.shelf_location ?? '', render: (c) => c.shelf_location ?? '—' },
    {
      key: 'acquired', header: 'Acquired', accessor: (c) => c.acquisition_date,
      render: (c) => <span className="text-muted-foreground">{formatDate(c.acquisition_date)}</span>,
    },
    {
      key: 'status', header: 'Status', accessor: (c) => c.status,
      render: (c) => <Badge variant={STATUS_VARIANT[c.status] ?? 'outline'}>{COPY_STATUSES.find((s) => s.value === c.status)?.label ?? c.status}</Badge>,
    },
    {
      key: 'actions', header: '', align: 'right', exportable: false, mobileAction: true,
      render: (c) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" title="Print spine / barcode label" onClick={() => printLabel(c)}><Printer className="h-4 w-4" /></Button>
          <Can perm="library.copies.change"><Button variant="ghost" size="icon" title="Edit" onClick={() => { setEditing(c); setDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button></Can>
          <Can perm="library.copies.delete"><Button variant="ghost" size="icon" title="Withdraw" onClick={() => setToWithdraw(c)}><Trash2 className="h-4 w-4 text-destructive" /></Button></Can>
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <Link href={`/${orgSlug}/catalog/${bibId}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to title
      </Link>
      <PageHeader
        title="Copies & Holdings"
        subtitle={bib?.title}
        icon={<BookCopy className="h-5 w-5" />}
        actions={<Can perm="library.copies.add"><Button className="gap-1.5" onClick={() => { setEditing(undefined); setDialogOpen(true); }}><Plus className="h-4 w-4" /> Add Copy</Button></Can>}
      />

      <DataTable
        columns={columns}
        rows={copies}
        rowKey={(c) => c.id}
        loading={isLoading}
        emptyState={<EmptyState
          icon={<BookCopy className="h-12 w-12" />}
          title="No copies yet"
          description="Add the first physical copy by scanning its barcode."
          action={<Button className="gap-1.5" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> Add Copy</Button>}
        />}
      />

      <CopyFormDialog
        open={dialogOpen}
        orgSlug={orgSlug}
        bibId={bibId}
        initial={editing}
        saving={createCopy.isPending || updateCopy.isPending}
        onSubmit={handleSubmit}
        onClose={() => { setDialogOpen(false); setEditing(undefined); }}
      />

      <ConfirmDialog
        open={!!toWithdraw}
        title="Withdraw this copy?"
        description={`Copy ${toWithdraw?.barcode} will be withdrawn from circulation. This is a sensitive action.`}
        variant="danger"
        confirmLabel="Withdraw copy"
        onConfirm={handleWithdraw}
        onCancel={() => setToWithdraw(null)}
      />

      <PdfPreview {...previewProps} />
    </div>
  );
}

export default function CopiesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading…</div>}>
      <CopiesContent />
    </Suspense>
  );
}
