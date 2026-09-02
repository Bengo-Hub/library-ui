'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle, Package, Plus, Truck } from 'lucide-react';
import {
  useOrder, useSubmitOrder, useAddLine, useReceiveLine,
  useVendors,
} from '@/hooks/useAcquisitions';
import { useBranches } from '@/hooks/useBranches';
import { useOutletStore } from '@/store/outlet';
import { PageHeader, Skeleton } from '@/components/ui/page';
import { Button, Badge, Card } from '@/components/ui/base';
import { DataTable, type DataTableColumn } from '@bengo-hub/shared-ui-lib/data-table';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/form';
import { Combobox } from '@/components/ui/combobox';
import { type PurchaseOrderLine, type POLineInput, type ReceiveLineInput, type POStatus } from '@/lib/api/acquisitions';
import { apiErrorMessage } from '@/lib/api/error-message';
import { formatDate, formatMoney } from '@/lib/format';

const todayISO = () => new Date().toISOString().slice(0, 10);

const STATUS_VARIANT: Record<POStatus, 'default' | 'success' | 'warning' | 'error' | 'outline'> = {
  DRAFT: 'outline', SUBMITTED: 'default', PARTIAL: 'warning', RECEIVED: 'success', CANCELLED: 'error',
};

const EMPTY_LINE: POLineInput = { title: '', unit_price: 0, quantity: 1 };

export default function OrderDetailPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const orderId = params?.id as string;

  const { data: order, isLoading } = useOrder(orgSlug, orderId);
  const { data: vendorsData } = useVendors(orgSlug);
  const { data: branchesPage } = useBranches(orgSlug);
  const currentOutlet = useOutletStore((s) => s.outlet);
  const submitOrder = useSubmitOrder(orgSlug);
  const addLine = useAddLine(orgSlug, orderId);
  const receiveLine = useReceiveLine(orgSlug, orderId);

  const [addOpen, setAddOpen] = useState(false);
  const [lineForm, setLineForm] = useState<POLineInput>(EMPTY_LINE);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receivingLine, setReceivingLine] = useState<PurchaseOrderLine | null>(null);
  const [receiveQty, setReceiveQty] = useState(1);
  const [receiveBranchId, setReceiveBranchId] = useState('');
  const [receiveShelfLoc, setReceiveShelfLoc] = useState('');
  const [receiveDate, setReceiveDate] = useState('');

  const vendors = vendorsData?.data ?? [];
  const branches = branchesPage?.data ?? [];
  const lines: PurchaseOrderLine[] = (order as any)?.edges?.lines ?? [];
  // Default branch for a receive: the branch the user is logged in to, else the tenant's default/HQ
  // branch, else the first branch — same fallback order CopyFormDialog already uses for Add Copy.
  const defaultReceiveBranchId =
    currentOutlet?.id
    || branches.find((b) => (b as { is_default?: boolean }).is_default)?.id
    || branches[0]?.id
    || '';

  const canEdit = order?.status === 'DRAFT';
  const canSubmit = order?.status === 'DRAFT' && lines.length > 0;
  const canReceive = order?.status === 'SUBMITTED' || order?.status === 'PARTIAL';

  async function handleSubmit() {
    try {
      await submitOrder.mutateAsync(orderId);
      toast.success('Purchase order submitted');
    } catch (e) { toast.error(await apiErrorMessage(e, 'Failed to submit order')); }
  }

  async function saveAddLine() {
    if (!lineForm.title.trim()) { toast.error('Title is required'); return; }
    if (lineForm.unit_price <= 0) { toast.error('Unit price must be greater than 0'); return; }
    if (lineForm.quantity < 1) { toast.error('Quantity must be at least 1'); return; }
    try {
      await addLine.mutateAsync(lineForm);
      toast.success('Line item added');
      setAddOpen(false);
      setLineForm(EMPTY_LINE);
    } catch (e) { toast.error(await apiErrorMessage(e, 'Failed to add line')); }
  }

  function openReceive(line: PurchaseOrderLine) {
    setReceivingLine(line);
    setReceiveQty(line.quantity - line.received_qty);
    setReceiveBranchId(defaultReceiveBranchId);
    setReceiveShelfLoc('');
    // Default to the PO's own order date (the shipment's real date) rather than today, so every
    // copy this receive creates shares one real acquisition date for audit purposes — editable.
    setReceiveDate(order?.order_date?.slice(0, 10) || todayISO());
    setReceiveOpen(true);
  }

  async function saveReceive() {
    if (!receivingLine) return;
    if (receiveQty < 1) { toast.error('Quantity must be at least 1'); return; }
    try {
      const result = await receiveLine.mutateAsync({
        lineId: receivingLine.id,
        data: {
          received_qty: receiveQty,
          branch_id: receiveBranchId || undefined,
          shelf_location: receiveShelfLoc || undefined,
          received_date: receiveDate || undefined,
        },
      });
      if (result.copies_failed) {
        toast.warning(`${result.copies_created} of ${receiveQty} copies created — ${result.copies_failed} failed. Check the copy list and retry if needed.`);
      } else {
        toast.success(`Received — ${result.copies_created} ${result.copies_created === 1 ? 'copy' : 'copies'} added to the catalog`);
      }
      setReceiveOpen(false);
    } catch (e) { toast.error(await apiErrorMessage(e, 'Failed to receive items')); }
  }

  const lineColumns: DataTableColumn<PurchaseOrderLine>[] = [
    {
      key: 'title', header: 'Title', primary: true,
      accessor: (l) => l.title,
      render: (l) => (
        <div>
          <p className="font-medium">{l.title}</p>
          {l.author && <p className="text-xs text-muted-foreground">{l.author}</p>}
          {l.isbn && <p className="text-xs text-muted-foreground font-mono">{l.isbn}</p>}
        </div>
      ),
    },
    {
      key: 'unit_price', header: 'Unit Price', sortable: true, accessor: (l) => parseFloat(String(l.unit_price)),
      render: (l) => formatMoney(parseFloat(String(l.unit_price))),
    },
    { key: 'quantity', header: 'Qty', sortable: true, accessor: (l) => l.quantity, render: (l) => l.quantity },
    {
      key: 'received', header: 'Received', accessor: (l) => l.received_qty,
      render: (l) => <span className={l.received_qty >= l.quantity ? 'text-green-600 font-medium' : ''}>{l.received_qty}/{l.quantity}</span>,
    },
    {
      key: 'status', header: 'Status', accessor: (l) => l.status,
      render: (l) => {
        const v = l.status === 'RECEIVED' ? 'success' : l.status === 'PARTIAL' ? 'warning' : l.status === 'CANCELLED' ? 'error' : 'outline';
        return <Badge variant={v as any}>{l.status}</Badge>;
      },
    },
    {
      key: 'actions', header: '', align: 'right', exportable: false, mobileAction: true,
      render: (l) => canReceive && l.status !== 'RECEIVED' && l.status !== 'CANCELLED' ? (
        <Button variant="outline" size="sm" className="gap-1.5" onClick={(e: React.MouseEvent) => { e.stopPropagation(); openReceive(l); }}>
          <Truck className="h-3.5 w-3.5" /> Receive
        </Button>
      ) : null,
    },
  ];

  if (isLoading) return <div className="max-w-6xl mx-auto"><Skeleton className="h-96" /></div>;
  if (!order) return <div className="max-w-6xl mx-auto"><p className="text-muted-foreground">Order not found.</p></div>;

  const vendor = vendors.find((v) => v.id === order.vendor_id);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Link href={`/${orgSlug}/acquisitions/orders`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Purchase Orders
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{order.po_number ?? 'DRAFT'}</h1>
            <Badge variant={STATUS_VARIANT[order.status]}>{order.status}</Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">{vendor?.name ?? order.vendor_id}</p>
        </div>
        <div className="flex items-center gap-2">
          {canSubmit && (
            <Button onClick={handleSubmit} disabled={submitOrder.isPending} className="gap-1.5">
              <CheckCircle className="h-4 w-4" />
              {submitOrder.isPending ? 'Submitting…' : 'Submit Order'}
            </Button>
          )}
          {canEdit && (
            <Button variant="outline" className="gap-1.5" onClick={() => { setLineForm(EMPTY_LINE); setAddOpen(true); }}>
              <Plus className="h-4 w-4" /> Add Item
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Order Date</p>
          <p className="font-medium mt-1">{formatDate(order.order_date) || '—'}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Expected</p>
          <p className="font-medium mt-1">{formatDate(order.expected_date) || '—'}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Subtotal</p>
          <p className="font-medium mt-1">{formatMoney(parseFloat(order.subtotal))}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total ({order.currency_code})</p>
          <p className="font-semibold mt-1 text-primary">{formatMoney(parseFloat(order.total))}</p>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-1.5"><Package className="h-4 w-4" /> Line Items</h2>
          {canEdit && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setLineForm(EMPTY_LINE); setAddOpen(true); }}>
              <Plus className="h-3.5 w-3.5" /> Add Item
            </Button>
          )}
        </div>
        {lines.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground text-sm">No line items. {canEdit && 'Add items to this order.'}</Card>
        ) : (
          <DataTable columns={lineColumns} rows={lines} rowKey={(l) => l.id} />
        )}
      </div>

      {order.notes && (
        <Card className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Notes</p>
          <p className="text-sm">{order.notes}</p>
        </Card>
      )}

      {/* Add Line Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="Add Line Item">
        <div className="space-y-4">
          <Field label="Title *">
            <input value={lineForm.title} onChange={(e) => setLineForm((f) => ({ ...f, title: e.target.value }))} placeholder="Item title" className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="ISBN">
              <input value={lineForm.isbn ?? ''} onChange={(e) => setLineForm((f) => ({ ...f, isbn: e.target.value }))} placeholder="978-..." className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
            </Field>
            <Field label="Author">
              <input value={lineForm.author ?? ''} onChange={(e) => setLineForm((f) => ({ ...f, author: e.target.value }))} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
            </Field>
            <Field label="Unit Price *">
              <input type="number" min="0.01" step="0.01" value={lineForm.unit_price} onChange={(e) => setLineForm((f) => ({ ...f, unit_price: Number(e.target.value) }))} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
            </Field>
            <Field label="Quantity *">
              <input type="number" min="1" step="1" value={lineForm.quantity} onChange={(e) => setLineForm((f) => ({ ...f, quantity: Number(e.target.value) }))} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
            </Field>
          </div>
          <Field label="Notes">
            <input value={lineForm.notes ?? ''} onChange={(e) => setLineForm((f) => ({ ...f, notes: e.target.value }))} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={saveAddLine} disabled={addLine.isPending}>{addLine.isPending ? 'Adding…' : 'Add Item'}</Button>
          </div>
        </div>
      </Dialog>

      {/* Receive Dialog */}
      <Dialog open={receiveOpen} onClose={() => setReceiveOpen(false)} title={`Receive: ${receivingLine?.title ?? ''}`}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {receivingLine?.received_qty ?? 0} of {receivingLine?.quantity ?? 0} already received. Each received copy will be added to the catalog.
          </p>
          <Field label="Quantity to receive">
            <input
              type="number"
              min="1"
              max={receivingLine ? receivingLine.quantity - receivingLine.received_qty : 1}
              value={receiveQty}
              onChange={(e) => setReceiveQty(Number(e.target.value))}
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Branch">
              <Combobox
                value={receiveBranchId}
                onChange={(v) => setReceiveBranchId(v || '')}
                options={branches.map((b) => ({ value: b.id, label: b.name }))}
                placeholder="— Select —"
                searchPlaceholder="Search branches…"
              />
            </Field>
            <Field label="Acquisition / received date" hint="One date for this whole batch — for audit purposes.">
              <input
                type="date"
                value={receiveDate}
                onChange={(e) => setReceiveDate(e.target.value)}
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none"
              />
            </Field>
          </div>
          <Field label="Shelf location">
            <input
              value={receiveShelfLoc}
              onChange={(e) => setReceiveShelfLoc(e.target.value)}
              placeholder="e.g. GEN, REF"
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none"
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setReceiveOpen(false)}>Cancel</Button>
            <Button onClick={saveReceive} disabled={receiveLine.isPending}>{receiveLine.isPending ? 'Receiving…' : 'Mark Received'}</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
