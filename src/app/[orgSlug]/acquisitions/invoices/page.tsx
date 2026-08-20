'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, FileText, Plus } from 'lucide-react';
import { useInvoices, useCreateInvoice, useVendors } from '@/hooks/useAcquisitions';
import { PageHeader, EmptyState } from '@/components/ui/page';
import { Button, Badge, Card } from '@/components/ui/base';
import { DataTable, type DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { CapsuleTabs } from '@/components/ui/tabs';
import { Pagination } from '@/components/ui/pagination';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/form';
import { type AcquisitionInvoice, type InvoiceStatus, type InvoiceInput } from '@/lib/api/acquisitions';
import { apiErrorMessage } from '@/lib/api/error-message';
import { formatDate, formatMoney } from '@/lib/format';

const STATUS_TABS: { value: InvoiceStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PAID', label: 'Paid' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const STATUS_VARIANT: Record<InvoiceStatus, 'default' | 'success' | 'warning' | 'error' | 'outline'> = {
  PENDING: 'warning', PAID: 'success', CANCELLED: 'error',
};

const EMPTY: InvoiceInput = { vendor_id: '', amount: 0 };

const PAGE_SIZE = 20;

export default function InvoicesPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;

  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useInvoices(orgSlug, { status: statusFilter || undefined, page, limit: PAGE_SIZE });
  const { data: vendorsData } = useVendors(orgSlug);
  const createInvoice = useCreateInvoice(orgSlug);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<InvoiceInput>(EMPTY);

  const invoices = data?.data ?? [];
  const vendors = vendorsData?.data ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  function set(key: keyof InvoiceInput) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function save() {
    if (!form.vendor_id) { toast.error('Vendor is required'); return; }
    if (!form.amount || form.amount <= 0) { toast.error('Amount must be greater than 0'); return; }
    try {
      await createInvoice.mutateAsync(form);
      toast.success('Invoice created and submitted to treasury');
      setOpen(false);
      setForm(EMPTY);
    } catch (e) { toast.error(await apiErrorMessage(e, 'Failed to create invoice')); }
  }

  const columns: DataTableColumn<AcquisitionInvoice>[] = [
    {
      key: 'invoice_no', header: 'Invoice #', primary: true, sortable: true,
      accessor: (inv) => inv.invoice_no ?? '—',
      render: (inv) => <span className="font-medium">{inv.invoice_no ?? '—'}</span>,
    },
    {
      key: 'vendor', header: 'Vendor', filterable: true,
      accessor: (inv) => vendors.find((v) => v.id === inv.vendor_id)?.name ?? inv.vendor_id,
      render: (inv) => {
        const v = vendors.find((v) => v.id === inv.vendor_id);
        return <span>{v?.name ?? inv.vendor_id.slice(0, 8)}</span>;
      },
    },
    {
      key: 'invoice_date', header: 'Date', sortable: true, accessor: (inv) => inv.invoice_date,
      render: (inv) => <span className="text-muted-foreground">{formatDate(inv.invoice_date)}</span>,
    },
    {
      key: 'amount', header: 'Amount', sortable: true, accessor: (inv) => parseFloat(inv.amount),
      render: (inv) => <span className="font-medium">{formatMoney(parseFloat(inv.amount))}</span>,
    },
    {
      key: 'status', header: 'Status', accessor: (inv) => inv.status,
      render: (inv) => <Badge variant={STATUS_VARIANT[inv.status]}>{inv.status}</Badge>,
    },
    {
      key: 'treasury', header: 'Treasury', exportable: false,
      accessor: (inv) => inv.treasury_invoice_id ?? '',
      render: (inv) => inv.treasury_invoice_id
        ? <span className="text-xs text-muted-foreground font-mono truncate">{inv.treasury_invoice_id.slice(0, 8)}…</span>
        : <span className="text-xs text-muted-foreground">—</span>,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <Link href={`/${orgSlug}/acquisitions/orders`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Acquisitions
      </Link>
      <PageHeader
        title="Acquisition Invoices"
        subtitle="Vendor invoices routed through treasury for payment"
        icon={<FileText className="h-5 w-5" />}
        actions={<Button className="gap-1.5" onClick={() => { setForm(EMPTY); setOpen(true); }}><Plus className="h-4 w-4" /> New Invoice</Button>}
      />

      <CapsuleTabs
        options={STATUS_TABS}
        value={statusFilter}
        onChange={(v) => { setStatusFilter(v as InvoiceStatus | ''); setPage(1); }}
        className="mb-4"
      />

      {invoices.length === 0 && !isLoading ? (
        <Card>
          <EmptyState icon={<FileText className="h-12 w-12" />} title="No invoices" description="Create an invoice to submit a vendor bill for payment." action={<Button onClick={() => setOpen(true)} className="gap-1.5"><Plus className="h-4 w-4" /> New Invoice</Button>} />
        </Card>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={invoices}
            rowKey={(inv) => inv.id}
            loading={isLoading}
            loadingRows={8}
            storageKey="library-acq-invoices"
            showExportCsv
            exportFileName="acquisition-invoices"
          />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title="New Acquisition Invoice">
        <div className="space-y-4">
          <Field label="Vendor *">
            <select value={form.vendor_id} onChange={set('vendor_id')} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none">
              <option value="">Select vendor…</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Invoice Number">
              <input value={form.invoice_no ?? ''} onChange={set('invoice_no')} placeholder="Vendor's invoice #" className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
            </Field>
            <Field label="Invoice Date">
              <input type="date" value={form.invoice_date ?? ''} onChange={set('invoice_date')} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
            </Field>
          </div>
          <Field label="Amount *">
            <input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
          </Field>
          <Field label="Notes">
            <textarea value={form.notes ?? ''} onChange={set('notes')} rows={2} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none resize-none" />
          </Field>
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
            Saving this invoice will automatically submit a vendor bill to treasury for payment processing.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={createInvoice.isPending}>{createInvoice.isPending ? 'Creating…' : 'Create Invoice'}</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
