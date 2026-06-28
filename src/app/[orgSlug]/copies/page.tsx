'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { BookCopy, Plus, Printer, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import { useBib } from '@/hooks/useCatalog';
import { useBibCopies, useCreateCopy, useUpdateCopy, useDeleteCopy } from '@/hooks/useCopies';
import { PageHeader, EmptyState } from '@/components/ui/page';
import { Button, Badge, Card } from '@/components/ui/base';
import { DataTable, type Column } from '@/components/ui/data-table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { CopyFormDialog } from '@/components/library/CopyFormDialog';
import { copiesApi, COPY_STATUSES, type Copy, type CopyInput } from '@/lib/api/copies';
import { apiErrorMessage } from '@/lib/api/error-message';
import { formatDate } from '@/lib/format';

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'error' | 'outline'> = {
  available: 'success', on_loan: 'warning', on_hold: 'warning', in_transit: 'default',
  reference: 'outline', lost: 'error', damaged: 'error', withdrawn: 'outline',
};

function CopiesContent() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const searchParams = useSearchParams();
  const bibId = searchParams?.get('bib') ?? '';

  const { data: bib } = useBib(orgSlug, bibId);
  const { data: copies = [], isLoading } = useBibCopies(orgSlug, bibId);
  const createCopy = useCreateCopy(orgSlug);
  const updateCopy = useUpdateCopy(orgSlug);
  const deleteCopy = useDeleteCopy(orgSlug);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Copy | undefined>();
  const [toWithdraw, setToWithdraw] = useState<Copy | null>(null);

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

  async function printLabel(copy: Copy) {
    try {
      const blob = await copiesApi.labelPdf(orgSlug, copy.id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      toast.error(await apiErrorMessage(e, 'Failed to generate label'));
    }
  }

  if (!bibId) {
    return (
      <div className="max-w-5xl mx-auto">
        <PageHeader title="Copies & Holdings" subtitle="Select a title to manage its copies" icon={<BookCopy className="h-5 w-5" />} />
        <EmptyState
          icon={<BookCopy className="h-12 w-12" />}
          title="Choose a title"
          description="Open a title from the catalog, then manage its physical copies here."
          action={<Link href={`/${orgSlug}/catalog`}><Button>Go to catalog</Button></Link>}
        />
      </div>
    );
  }

  const columns: Column<Copy>[] = [
    { key: 'barcode', header: 'Barcode', primary: true, cell: (c) => <span className="font-mono text-xs">{c.barcode}</span> },
    { key: 'branch', header: 'Branch', cell: (c) => c.branch_name ?? '—' },
    { key: 'shelf', header: 'Shelf', cell: (c) => c.shelf_location ?? '—' },
    { key: 'acquired', header: 'Acquired', cell: (c) => <span className="text-muted-foreground">{formatDate(c.acquisition_date)}</span> },
    { key: 'status', header: 'Status', cell: (c) => <Badge variant={STATUS_VARIANT[c.status] ?? 'outline'}>{COPY_STATUSES.find((s) => s.value === c.status)?.label ?? c.status}</Badge> },
    {
      key: 'actions', header: '', actions: true, align: 'right',
      cell: (c) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" title="Print spine / barcode label" onClick={() => printLabel(c)}><Printer className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" title="Edit" onClick={() => { setEditing(c); setDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" title="Withdraw" onClick={() => setToWithdraw(c)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
        actions={<Button className="gap-1.5" onClick={() => { setEditing(undefined); setDialogOpen(true); }}><Plus className="h-4 w-4" /> Add Copy</Button>}
      />

      <Card>
        <DataTable
          columns={columns}
          rows={copies}
          rowKey={(c) => c.id}
          loading={isLoading}
          skeletonRows={4}
          empty={<EmptyState
            icon={<BookCopy className="h-12 w-12" />}
            title="No copies yet"
            description="Add the first physical copy by scanning its barcode."
            action={<Button className="gap-1.5" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> Add Copy</Button>}
          />}
        />
      </Card>

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
