'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { BookCopy, Plus, Printer, Pencil, Trash2, ArrowLeft, Search, ScanLine, Layers, Usb } from 'lucide-react';
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
import { copiesApi, COPY_STATUSES, type Copy, type CopyInput, type CopyStatus, type LabelFormat, type LabelTemplateName } from '@/lib/api/copies';
import { apiErrorMessage } from '@/lib/api/error-message';
import { formatDate } from '@/lib/format';
import { agentAvailable, blobToHex, listLocalPrinters, printRawToLocalName } from '@/lib/library/print-agent';
import { getLabelPrintPrefs, setLabelPrintPrefs } from '@/lib/library/label-print-prefs';

// Thermal label-roll templates: "rows" = labels side-by-side across the roll's width (lanes).
// Sizes/gaps are engineering estimates fit within a ≤80mm thermal roll (e.g. Xprinter XP-330B)
// — libraries with different real stock should pick "Custom". See library-api/docs/barcode-labels.md.
const THERMAL_TEMPLATES: { value: LabelTemplateName; label: string; hint: string }[] = [
  { value: '1row_29x62', label: '1 row — 29x62mm (default, bench-verified)', hint: 'Single lane; matches the real spine/holding label roll confirmed on an Xprinter XP-330B' },
  { value: '2row_35x29', label: '2 rows — 35x29mm each', hint: 'Wider roll, 2 labels side by side' },
  { value: '3row_23x29', label: '3 rows — 23x29mm each', hint: 'Wider roll, 3 labels side by side' },
  { value: '4row_17x29', label: '4 rows — 17x29mm each', hint: 'Wider roll, 4 labels side by side' },
  { value: 'custom', label: 'Custom…', hint: "Enter your roll's exact size/rows/gaps" },
];

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
  const [bulkPrintOpen, setBulkPrintOpen] = useState(false);
  const [bulkSheet, setBulkSheet] = useState<'l7160' | '5160'>('l7160');
  // Seeded from the last-saved label-print prefs (see lib/library/label-print-prefs.ts) so this
  // dialog AND the per-row quick-print button (printLabel, above) share one resolved template —
  // otherwise a template fixed here for the bulk job wouldn't apply to the per-row button.
  const initialLabelPrefs = useState(() => getLabelPrintPrefs())[0];
  const [bulkFormat, setBulkFormat] = useState<LabelFormat>(initialLabelPrefs.format ?? 'avery_a4');
  const [bulkTemplate, setBulkTemplate] = useState<LabelTemplateName>(initialLabelPrefs.template ?? '1row_29x62');
  const [bulkRotate, setBulkRotate] = useState(initialLabelPrefs.rotate ?? false);
  const [customW, setCustomW] = useState(initialLabelPrefs.custom_label_w_in ?? 29 / 25.4);
  const [customH, setCustomH] = useState(initialLabelPrefs.custom_label_h_in ?? 62 / 25.4);
  const [customLanes, setCustomLanes] = useState(initialLabelPrefs.custom_lanes ?? 1);
  const [customGapX, setCustomGapX] = useState(initialLabelPrefs.custom_gap_x_in ?? 0.08);
  const [customGapY, setCustomGapY] = useState(initialLabelPrefs.custom_gap_y_in ?? 0.08);

  // Direct USB printing via the local print-agent (see lib/library/print-agent.ts) — reuses the
  // same loopback agent pos-ui/inventory-ui talk to, no separate install needed if it's running.
  const [agentUp, setAgentUp] = useState(false);
  const [localPrinters, setLocalPrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState(initialLabelPrefs.printerName ?? '');
  const [agentPrinting, setAgentPrinting] = useState(false);

  // Detect the agent whenever thermal is the active format — NOT gated on the bulk dialog being
  // open, so the per-row quick-print button also has a fresh agentUp/selectedPrinter without
  // requiring the user to open the bulk dialog first.
  useEffect(() => {
    if (bulkFormat !== 'thermal_tspl') return;
    let cancelled = false;
    (async () => {
      const up = await agentAvailable();
      if (cancelled) return;
      setAgentUp(up);
      if (up) {
        const printers = await listLocalPrinters();
        if (!cancelled) {
          setLocalPrinters(printers);
          setSelectedPrinter((prev) => prev || printers[0] || '');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [bulkFormat]);

  // Persist every choice so the per-row quick-print button and future sessions reuse it.
  useEffect(() => {
    setLabelPrintPrefs({
      format: bulkFormat, template: bulkTemplate, rotate: bulkRotate,
      custom_label_w_in: customW, custom_label_h_in: customH, custom_lanes: customLanes,
      custom_gap_x_in: customGapX, custom_gap_y_in: customGapY,
      printerName: selectedPrinter,
    });
  }, [bulkFormat, bulkTemplate, bulkRotate, customW, customH, customLanes, customGapX, customGapY, selectedPrinter]);

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

  // Shared by both the bulk dialog and the per-row quick-print button below, so a single copy's
  // "print" icon never diverges from whatever template/rotate/format the bulk job was fixed to
  // use — that divergence (the row button calling labelPdf() bare, with no template/rotate at
  // all) was the bug: the bulk path could be printing correctly while the row button still
  // silently defaulted to an un-rotated 29x62mm template regardless.
  function labelPrintOpts() {
    return {
      format: bulkFormat,
      ...(bulkFormat === 'thermal_tspl'
        ? {
            template: bulkTemplate,
            rotate: bulkRotate,
            ...(bulkTemplate === 'custom'
              ? {
                  custom_label_w_in: customW,
                  custom_label_h_in: customH,
                  custom_lanes: customLanes,
                  custom_gap_x_in: customGapX,
                  custom_gap_y_in: customGapY,
                }
              : {}),
          }
        : {}),
    };
  }

  function bulkPrintBody() {
    return {
      status: statusFilter || undefined,
      branch_id: branchFilter || undefined,
      sheet: bulkSheet,
      ...labelPrintOpts(),
    };
  }

  /** Attempts direct-USB thermal printing via the local agent when a printer is remembered, and
   *  ALWAYS falls back to opening a normal browser-printable PDF (avery_a4) when no printer is
   *  configured or the agent rejects/can't be reached — a raw .tspl text download is not
   *  something an end user can act on by itself, so it must never be the only outcome (this was
   *  the reported gap: "no fallback browser printing if printer is not detected"). The agent
   *  attempt is made directly regardless of the earlier agentUp probe (see printRawToLocalName's
   *  doc comment) since that probe can occasionally disagree with a live attempt. */
  async function printThermalOrFallbackToPdf(opts: {
    fetchTspl: () => Promise<Blob>;
    fetchPdf: () => Promise<Blob>;
    pdfFileName: string;
    pdfTitle: string;
  }) {
    if (selectedPrinter) {
      try {
        const blob = await opts.fetchTspl();
        const hex = await blobToHex(blob);
        const ok = await printRawToLocalName(selectedPrinter, hex);
        if (ok) {
          toast.success(`Sent to ${selectedPrinter}`);
          return;
        }
      } catch {
        // fall through to the PDF fallback below
      }
      toast.error('Could not reach the local print agent — opening a printable PDF instead');
    } else {
      toast('No printer configured for direct USB printing — opening a printable PDF instead. Set one in Settings > Printing.');
    }
    void openPreview(opts.fetchPdf, { fileName: opts.pdfFileName, title: opts.pdfTitle, orientation: 'portrait' });
  }

  /** Quick single-copy print — reuses the SAME format/template/rotate/printer as the bulk
   *  dialog (see labelPrintOpts). format=avery_a4 previews the PDF directly; format=thermal_tspl
   *  goes through printThermalOrFallbackToPdf (agent print, or a printable PDF fallback). */
  function printLabel(copy: Copy) {
    const opts = labelPrintOpts();
    if (opts.format !== 'thermal_tspl') {
      void openPreview(() => copiesApi.labelPdf(orgSlug, copy.id, opts), {
        fileName: `label-${copy.barcode}.pdf`, title: 'Spine / barcode label', orientation: 'landscape',
      });
      return;
    }
    void printThermalOrFallbackToPdf({
      fetchTspl: () => copiesApi.labelPdf(orgSlug, copy.id, opts),
      fetchPdf: () => copiesApi.labelPdf(orgSlug, copy.id, { format: 'avery_a4' }),
      pdfFileName: `label-${copy.barcode}.pdf`,
      pdfTitle: 'Spine / barcode label',
    });
  }

  function handleBulkPrint() {
    setBulkPrintOpen(false);
    if (bulkFormat === 'thermal_tspl') {
      void printThermalOrFallbackToPdf({
        fetchTspl: () => copiesApi.printLabels(orgSlug, bulkPrintBody()),
        fetchPdf: () => copiesApi.printLabels(orgSlug, { status: statusFilter || undefined, branch_id: branchFilter || undefined, sheet: bulkSheet, format: 'avery_a4' }),
        pdfFileName: 'copy-labels.pdf',
        pdfTitle: 'Bulk copy labels',
      });
      return;
    }
    void openPreview(
      () => copiesApi.printLabels(orgSlug, bulkPrintBody()),
      { fileName: 'copy-labels.pdf', title: 'Bulk copy labels', orientation: 'portrait' },
    );
  }

  /** Print directly via USB through the local print-agent (see lib/library/print-agent.ts) —
   *  bypasses the OS print dialog entirely, which is what produced the rotated-label bug this
   *  feature fixes. Only offered for format=thermal_tspl (raw printer command bytes). Unlike
   *  handleBulkPrint's fallback, this button is an explicit "force via agent" action, so it
   *  errors out (rather than silently falling back to a PDF) when nothing is picked/reachable. */
  async function printBulkViaAgent() {
    if (!selectedPrinter) {
      toast.error('Pick a printer first');
      return;
    }
    setAgentPrinting(true);
    try {
      const blob = await copiesApi.printLabels(orgSlug, bulkPrintBody());
      const hex = await blobToHex(blob);
      const ok = await printRawToLocalName(selectedPrinter, hex);
      if (ok) {
        toast.success(`Sent to ${selectedPrinter}`);
        setBulkPrintOpen(false);
      } else {
        toast.error('Local print agent rejected the job — try downloading instead');
      }
    } catch (e) {
      toast.error(await apiErrorMessage(e, 'Failed to print via local agent'));
    } finally {
      setAgentPrinting(false);
    }
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
            <div className="flex items-center gap-2">
              <Button variant="outline" className="gap-1.5" onClick={() => setBulkPrintOpen(true)}>
                <Layers className="h-4 w-4" /> Print labels
              </Button>
              <Link href={`/${orgSlug}/catalog`}>
                <Button variant="outline" className="gap-1.5"><Plus className="h-4 w-4" /> Add via Catalog</Button>
              </Link>
            </div>
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

        <Dialog
          open={bulkPrintOpen}
          onClose={() => setBulkPrintOpen(false)}
          title="Print labels"
          description="Prints one holding label per copy matching the currently applied filters below."
          footer={
            <>
              <Button variant="outline" onClick={() => setBulkPrintOpen(false)}>Cancel</Button>
              <Button onClick={handleBulkPrint}>
                {bulkFormat === 'avery_a4' ? 'Print sheet' : 'Print'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-accent/10 px-3 py-2 text-sm text-muted-foreground">
              This will print labels for the <strong className="text-foreground">currently applied filters</strong>:{' '}
              status <strong className="text-foreground">{statusFilter ? (COPY_STATUSES.find((s) => s.value === statusFilter)?.label ?? statusFilter) : 'All'}</strong>
              {branchFilter && (
                <>, branch <strong className="text-foreground">{branches.find((b) => b.id === branchFilter)?.name ?? branchFilter}</strong></>
              )}
              .
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Format</label>
              <Select value={bulkFormat} onChange={(e) => setBulkFormat(e.target.value as LabelFormat)}>
                <option value="avery_a4">Avery sheet (PDF, for an office printer)</option>
                <option value="thermal_tspl">Thermal (TSPL, for Xprinter/TSC-compatible printers)</option>
              </Select>
            </div>

            {bulkFormat === 'avery_a4' && (
              <div>
                <label className="block text-sm font-medium mb-1.5">Label sheet</label>
                <Select value={bulkSheet} onChange={(e) => setBulkSheet(e.target.value as 'l7160' | '5160')}>
                  <option value="l7160">Avery L7160 (A4, 21/sheet)</option>
                  <option value="5160">Avery 5160 (US Letter, 30/sheet)</option>
                </Select>
              </div>
            )}

            {bulkFormat === 'thermal_tspl' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Label template — &quot;rows&quot; are labels side-by-side across the roll&apos;s width
                  </label>
                  <Select value={bulkTemplate} onChange={(e) => setBulkTemplate(e.target.value as LabelTemplateName)}>
                    {THERMAL_TEMPLATES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </Select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {THERMAL_TEMPLATES.find((t) => t.value === bulkTemplate)?.hint}
                  </p>
                </div>

                {bulkTemplate === 'custom' && (
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs text-muted-foreground">
                      Label width (in)
                      <input type="number" step="0.1" min={0.1} value={customW}
                        onChange={(e) => setCustomW(Number(e.target.value) || 0.1)}
                        className="mt-0.5 w-full rounded-lg border border-input bg-background px-2 py-1 text-sm" />
                    </label>
                    <label className="text-xs text-muted-foreground">
                      Label height (in)
                      <input type="number" step="0.1" min={0.1} value={customH}
                        onChange={(e) => setCustomH(Number(e.target.value) || 0.1)}
                        className="mt-0.5 w-full rounded-lg border border-input bg-background px-2 py-1 text-sm" />
                    </label>
                    <label className="text-xs text-muted-foreground">
                      Rows (1-4)
                      <input type="number" min={1} max={4} value={customLanes}
                        onChange={(e) => setCustomLanes(Math.min(4, Math.max(1, Number(e.target.value) || 1)))}
                        className="mt-0.5 w-full rounded-lg border border-input bg-background px-2 py-1 text-sm" />
                    </label>
                    <label className="text-xs text-muted-foreground">
                      Gap between rows (in)
                      <input type="number" step="0.01" min={0} value={customGapX}
                        onChange={(e) => setCustomGapX(Number(e.target.value) || 0)}
                        className="mt-0.5 w-full rounded-lg border border-input bg-background px-2 py-1 text-sm" />
                    </label>
                    <label className="text-xs text-muted-foreground col-span-2">
                      Gap between labels along the feed (in)
                      <input type="number" step="0.01" min={0} value={customGapY}
                        onChange={(e) => setCustomGapY(Number(e.target.value) || 0)}
                        className="mt-0.5 w-full rounded-lg border border-input bg-background px-2 py-1 text-sm" />
                    </label>
                  </div>
                )}

                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={bulkRotate} onChange={(e) => setBulkRotate(e.target.checked)} />
                  Rotate 90° (roll is mounted with the label&apos;s long edge along the feed)
                </label>

                <div className="rounded-lg border border-input p-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Usb className="h-3.5 w-3.5" />
                    Direct USB printing
                  </div>
                  {agentUp ? (
                    localPrinters.length > 0 ? (
                      <>
                        <Select value={selectedPrinter} onChange={(e) => setSelectedPrinter(e.target.value)}>
                          {localPrinters.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </Select>
                        <Button variant="outline" className="w-full" onClick={printBulkViaAgent} disabled={agentPrinting}>
                          <Usb className="h-4 w-4 mr-1.5" />
                          {agentPrinting ? 'Sending…' : `Print via Local Agent (${selectedPrinter})`}
                        </Button>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Print agent detected, but no installed printers found. Install the printer&apos;s Windows driver first.
                      </p>
                    )
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Local print agent not detected on this machine. Install/start it to print directly via USB instead of downloading a file.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
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
