'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, BookMarked, BookText, FileDown, Pencil, Sparkles, Trash2 } from 'lucide-react';
import { useBib, useDeleteBib, useRecommendations } from '@/hooks/useCatalog';
import { useBibCopies } from '@/hooks/useCopies';
import { catalogApi } from '@/lib/api/catalog';
import { usePlaceHold } from '@/hooks/useHolds';
import { Button, Badge, Card } from '@/components/ui/base';
import { Skeleton } from '@/components/ui/page';
import { DataTable, type DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { CoverThumb } from '@/components/library/CoverThumb';
import { AvailabilityBadge } from '@/components/library/AvailabilityBadge';
import { COPY_STATUSES, type Copy } from '@/lib/api/copies';
import { apiErrorMessage } from '@/lib/api/error-message';
import { formatDate } from '@/lib/format';
import { languageName } from '@/lib/languages';
import { MemberPicker } from '@/components/library/MemberPicker';
import { Can } from '@/components/auth/Can';

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'error' | 'outline'> = {
  available: 'success', on_loan: 'warning', on_hold: 'warning', in_transit: 'default',
  reference: 'outline', lost: 'error', damaged: 'error', withdrawn: 'outline',
};

export default function BibDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params?.orgSlug as string;
  const id = params?.id as string;

  const { data: bib, isLoading } = useBib(orgSlug, id);
  const { data: copies = [], isLoading: copiesLoading } = useBibCopies(orgSlug, id);
  const { data: recs = [] } = useRecommendations(orgSlug, id);
  const deleteBib = useDeleteBib(orgSlug);
  const placeHold = usePlaceHold(orgSlug);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [holdOpen, setHoldOpen] = useState(false);

  async function handleDelete() {
    try {
      await deleteBib.mutateAsync(id);
      toast.success('Title deleted');
      router.replace(`/${orgSlug}/catalog`);
    } catch (e) {
      toast.error(await apiErrorMessage(e, 'Failed to delete title'));
    } finally {
      setConfirmDelete(false);
    }
  }

  // Export the bib as MARCXML through the authenticated client (the raw API URL 401s in a plain
  // browser tab since it carries no Bearer token), then download it as a .marc.xml file.
  async function downloadMarc() {
    try {
      const blob = await catalogApi.marcXml(orgSlug, id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(bib?.title || 'record').replace(/[^\w.-]+/g, '_')}.marc.xml`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      toast.error(await apiErrorMessage(e, 'Failed to export MARCXML'));
    }
  }

  async function handlePlaceHold(memberId: string) {
    try {
      await placeHold.mutateAsync({ bib_record_id: id, member_id: memberId });
      toast.success('Hold placed');
      setHoldOpen(false);
    } catch (e) {
      toast.error(await apiErrorMessage(e, 'Failed to place hold'));
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (!bib) {
    return <div className="max-w-5xl mx-auto p-8 text-center text-muted-foreground">Title not found.</div>;
  }

  const copyColumns: DataTableColumn<Copy>[] = [
    {
      key: 'barcode', header: 'Accession / Barcode Number', primary: true,
      accessor: (c) => c.barcode,
      render: (c) => <span className="font-mono text-xs">{c.barcode}</span>,
    },
    { key: 'branch', header: 'Branch', accessor: (c) => c.branch_name ?? '', render: (c) => c.branch_name ?? '—' },
    { key: 'shelf', header: 'Shelf', accessor: (c) => c.shelf_location ?? '', render: (c) => c.shelf_location ?? '—' },
    {
      key: 'status', header: 'Status', accessor: (c) => c.status,
      render: (c) => (
        <Badge variant={STATUS_VARIANT[c.status] ?? 'outline'}>
          {COPY_STATUSES.find((s) => s.value === c.status)?.label ?? c.status}
        </Badge>
      ),
    },
    {
      key: 'due', header: 'Due',
      accessor: (c) => c.due_date ?? '',
      render: (c) => <span className="text-muted-foreground">{c.due_date ? formatDate(c.due_date) : '—'}</span>,
    },
  ];

  const meta: { label: string; value?: string | number | null }[] = [
    { label: 'Author', value: bib.authors?.join(', ') || bib.author },
    { label: 'Publisher', value: bib.publisher },
    { label: 'Place', value: bib.publication_place },
    { label: 'Year', value: bib.publication_year },
    { label: 'Edition', value: bib.edition },
    { label: 'ISBN', value: bib.isbn },
    { label: 'Other ISBN', value: bib.other_isbns?.join(', ') },
    { label: 'ISSN', value: bib.issn },
    { label: 'Language', value: languageName(bib.language) },
    { label: 'Dewey', value: bib.dewey },
    { label: 'Collection', value: bib.collection_name },
    { label: 'Pages', value: bib.pages },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <Link href={`/${orgSlug}/catalog`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to catalog
      </Link>

      <Card>
        <div className="p-6 flex flex-col sm:flex-row gap-6">
          <div className="shrink-0 mx-auto sm:mx-0 space-y-2">
            <CoverThumb url={bib.cover_url} title={bib.title} className="w-40 aspect-[3/4]" />
            {bib.cover_back_url && (
              <CoverThumb url={bib.cover_back_url} title={`${bib.title} (back)`} className="w-40 aspect-[3/4] opacity-90" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-2xl font-black tracking-tight">{bib.title}</h1>
                {bib.subtitle && <p className="text-muted-foreground mt-1">{bib.subtitle}</p>}
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">{bib.format}</Badge>
                  <AvailabilityBadge bib={bib} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Can perm="library.holds.place">
                  <Button variant="outline" className="gap-1.5" onClick={() => setHoldOpen(true)}>
                    <BookMarked className="h-4 w-4" /> Place Hold
                  </Button>
                </Can>
                <Can perm="library.catalog.change">
                  <Link href={`/${orgSlug}/cataloging?id=${bib.id}`}>
                    <Button variant="outline" className="gap-1.5"><Pencil className="h-4 w-4" /> Edit</Button>
                  </Link>
                </Can>
                <Button variant="outline" className="gap-1.5" title="Export this record as MARCXML" onClick={() => downloadMarc()}>
                  <FileDown className="h-4 w-4" /> MARC
                </Button>
                <Can perm="library.catalog.delete">
                  <Button variant="destructive" size="icon" onClick={() => setConfirmDelete(true)} aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </Can>
              </div>
            </div>

            <dl className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
              {meta.filter((m) => m.value != null && m.value !== '').map((m) => (
                <div key={m.label}>
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{m.label}</dt>
                  <dd className="text-sm font-medium mt-0.5">{m.value}</dd>
                </div>
              ))}
            </dl>

            {bib.subjects && bib.subjects.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {bib.subjects.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
              </div>
            )}

            {bib.description && <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{bib.description}</p>}
          </div>
        </div>
      </Card>

      {/* Holdings */}
      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <BookText className="h-4 w-4" /> Copies & Holdings
        </h2>
        <Link href={`/${orgSlug}/copies?bib=${bib.id}`} className="text-sm font-semibold text-primary hover:underline">Manage copies</Link>
      </div>

      <DataTable<Copy>
        className="mt-3"
        columns={copyColumns}
        rows={copies}
        rowKey={(c) => c.id}
        loading={copiesLoading}
        emptyState={
          <div className="text-center text-sm text-muted-foreground">
            No copies attached.{' '}
            <Link href={`/${orgSlug}/copies?bib=${bib.id}`} className="text-primary hover:underline">Add the first copy.</Link>
          </div>
        }
      />

      {recs.length > 0 && (
        <>
          <h2 className="mt-8 mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Members who borrowed this also borrowed
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {recs.map((rec) => (
              <Link key={rec.bib_record_id} href={`/${orgSlug}/catalog/${rec.bib_record_id}`} className="rounded-xl border border-border bg-card p-3 hover:border-primary/40 hover:shadow-sm transition-all">
                <p className="text-sm font-semibold line-clamp-2">{rec.title || 'Untitled'}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">co-borrowed ×{rec.score}</p>
              </Link>
            ))}
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this title?"
        description="This removes the bibliographic record. Copies must be withdrawn first. This cannot be undone."
        variant="danger"
        confirmLabel="Delete title"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      <MemberPicker
        open={holdOpen}
        orgSlug={orgSlug}
        title="Place a hold"
        description={`Select the member requesting "${bib.title}".`}
        confirmLabel="Place hold"
        loading={placeHold.isPending}
        onSelect={handlePlaceHold}
        onCancel={() => setHoldOpen(false)}
      />
    </div>
  );
}
