'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, ShoppingCart } from 'lucide-react';
import { useOrders, useCreateOrder, useVendors } from '@/hooks/useAcquisitions';
import { PageHeader, EmptyState } from '@/components/ui/page';
import { Button, Badge, Card } from '@/components/ui/base';
import { DataTable, type DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { CapsuleTabs } from '@/components/ui/tabs';
import { Pagination } from '@/components/ui/pagination';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/form';
import { type PurchaseOrder, type POStatus, type POInput } from '@/lib/api/acquisitions';
import { apiErrorMessage } from '@/lib/api/error-message';
import { formatDate, formatMoney } from '@/lib/format';

const STATUS_TABS: { value: POStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const STATUS_VARIANT: Record<POStatus, 'default' | 'success' | 'warning' | 'error' | 'outline'> = {
  DRAFT: 'outline', SUBMITTED: 'default', PARTIAL: 'warning', RECEIVED: 'success', CANCELLED: 'error',
};

const EMPTY: POInput = { vendor_id: '', currency_code: 'KES', tax: 0 };

const PAGE_SIZE = 20;

export default function OrdersPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;

  const [statusFilter, setStatusFilter] = useState<POStatus | ''>('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useOrders(orgSlug, { status: statusFilter || undefined, page, limit: PAGE_SIZE });
  const { data: vendorsData } = useVendors(orgSlug, true);
  const createOrder = useCreateOrder(orgSlug);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<POInput>(EMPTY);

  const orders = data?.data ?? [];
  const vendors = vendorsData?.data ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  function set(key: keyof POInput) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function save() {
    if (!form.vendor_id) { toast.error('Vendor is required'); return; }
    try {
      const order = await createOrder.mutateAsync(form);
      toast.success('Purchase order created');
      setOpen(false);
      setForm(EMPTY);
      window.location.href = `/${orgSlug}/acquisitions/orders/${order.id}`;
    } catch (e) { toast.error(await apiErrorMessage(e, 'Failed to create order')); }
  }

  const columns: DataTableColumn<PurchaseOrder>[] = [
    {
      key: 'po_number', header: 'PO#', primary: true, sortable: true,
      accessor: (o) => o.po_number ?? 'DRAFT',
      render: (o) => <Link href={`/${orgSlug}/acquisitions/orders/${o.id}`} className="font-medium hover:text-primary">{o.po_number ?? 'DRAFT'}</Link>,
    },
    {
      key: 'vendor', header: 'Vendor', filterable: true,
      accessor: (o) => vendors.find((v) => v.id === o.vendor_id)?.name ?? o.vendor_id,
      render: (o) => {
        const v = vendors.find((v) => v.id === o.vendor_id);
        return <span>{v?.name ?? o.vendor_id.slice(0, 8)}</span>;
      },
    },
    {
      key: 'order_date', header: 'Order Date', sortable: true, accessor: (o) => o.order_date,
      render: (o) => <span className="text-muted-foreground">{formatDate(o.order_date)}</span>,
    },
    {
      key: 'total', header: 'Total', sortable: true, accessor: (o) => parseFloat(o.total),
      render: (o) => <span className="font-medium">{formatMoney(parseFloat(o.total))} {o.currency_code}</span>,
    },
    { key: 'status', header: 'Status', accessor: (o) => o.status, render: (o) => <Badge variant={STATUS_VARIANT[o.status]}>{o.status}</Badge> },
    {
      key: 'actions', header: '', align: 'right', exportable: false, mobileAction: true,
      render: (o) => <Link href={`/${orgSlug}/acquisitions/orders/${o.id}`} onClick={(e) => e.stopPropagation()}><Button variant="outline" size="sm">View</Button></Link>,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Purchase Orders"
        subtitle="Manage vendor orders and receiving"
        icon={<ShoppingCart className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/${orgSlug}/acquisitions/vendors`}><Button variant="outline" size="sm">Vendors</Button></Link>
            <Link href={`/${orgSlug}/acquisitions/budgets`}><Button variant="outline" size="sm">Budgets</Button></Link>
            <Link href={`/${orgSlug}/acquisitions/invoices`}><Button variant="outline" size="sm">Invoices</Button></Link>
            <Button className="gap-1.5" onClick={() => { setForm(EMPTY); setOpen(true); }}><Plus className="h-4 w-4" /> New PO</Button>
          </div>
        }
      />

      <CapsuleTabs
        options={STATUS_TABS}
        value={statusFilter}
        onChange={(v) => { setStatusFilter(v as POStatus | ''); setPage(1); }}
        className="mb-4"
      />

      {orders.length === 0 && !isLoading ? (
        <Card>
          <EmptyState icon={<ShoppingCart className="h-12 w-12" />} title="No orders" description="Create a purchase order to order items from a vendor." action={<Button onClick={() => setOpen(true)} className="gap-1.5"><Plus className="h-4 w-4" /> New PO</Button>} />
        </Card>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={orders}
            rowKey={(o) => o.id}
            loading={isLoading}
            loadingRows={8}
            storageKey="library-po"
            showExportCsv
            exportFileName="purchase-orders"
          />
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title="New Purchase Order">
        <div className="space-y-4">
          <Field label="Vendor *">
            <select value={form.vendor_id} onChange={set('vendor_id')} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none">
              <option value="">Select vendor…</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Order Date">
              <input type="date" value={form.order_date ?? ''} onChange={set('order_date')} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
            </Field>
            <Field label="Expected Date">
              <input type="date" value={form.expected_date ?? ''} onChange={set('expected_date')} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
            </Field>
            <Field label="Currency">
              <input value={form.currency_code ?? 'KES'} onChange={set('currency_code')} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
            </Field>
            <Field label="Tax">
              <input type="number" min="0" step="0.01" value={form.tax ?? 0} onChange={(e) => setForm((f) => ({ ...f, tax: Number(e.target.value) }))} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
            </Field>
          </div>
          <Field label="Notes">
            <textarea value={form.notes ?? ''} onChange={set('notes')} rows={2} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none resize-none" />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={createOrder.isPending}>{createOrder.isPending ? 'Creating…' : 'Create PO'}</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
