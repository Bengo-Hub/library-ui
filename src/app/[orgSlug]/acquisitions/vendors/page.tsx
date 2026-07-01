'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Building2, Pencil, Plus } from 'lucide-react';
import { useVendors, useCreateVendor, useUpdateVendor } from '@/hooks/useAcquisitions';
import { PageHeader, EmptyState, Skeleton } from '@/components/ui/page';
import { Button, Badge, Card } from '@/components/ui/base';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/form';
import { type Vendor, type VendorInput, type PaymentTerms } from '@/lib/api/acquisitions';
import { apiErrorMessage } from '@/lib/api/error-message';

const TERMS: PaymentTerms[] = ['NET_30', 'NET_60', 'COD', 'PREPAID'];

const EMPTY: VendorInput = { name: '', payment_terms: 'NET_30', is_active: true };

export default function VendorsPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;

  const { data, isLoading } = useVendors(orgSlug);
  const createVendor = useCreateVendor(orgSlug);
  const updateVendor = useUpdateVendor(orgSlug);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | undefined>();
  const [form, setForm] = useState<VendorInput>(EMPTY);

  const vendors = data?.data ?? [];

  function openNew() { setEditing(undefined); setForm(EMPTY); setOpen(true); }
  function openEdit(v: Vendor) {
    setEditing(v);
    setForm({
      name: v.name,
      code: v.code ?? '',
      contact_name: v.contact_name ?? '',
      contact_email: v.contact_email ?? '',
      contact_phone: v.contact_phone ?? '',
      address: v.address ?? '',
      website: v.website ?? '',
      account_number: v.account_number ?? '',
      payment_terms: v.payment_terms,
      notes: v.notes ?? '',
      is_active: v.is_active,
    });
    setOpen(true);
  }

  function set(key: keyof VendorInput) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function save() {
    if (!form.name.trim()) { toast.error('Vendor name is required'); return; }
    try {
      if (editing) {
        await updateVendor.mutateAsync({ id: editing.id, data: form });
        toast.success('Vendor updated');
      } else {
        await createVendor.mutateAsync(form);
        toast.success('Vendor created');
      }
      setOpen(false);
    } catch (e) { toast.error(await apiErrorMessage(e, 'Failed to save vendor')); }
  }

  const isBusy = createVendor.isPending || updateVendor.isPending;

  return (
    <div className="max-w-6xl mx-auto">
      <Link href={`/${orgSlug}/acquisitions/orders`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Acquisitions
      </Link>
      <PageHeader
        title="Vendors"
        subtitle="Manage supplier information for acquisitions"
        icon={<Building2 className="h-5 w-5" />}
        actions={<Button className="gap-1.5" onClick={openNew}><Plus className="h-4 w-4" /> Add Vendor</Button>}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : vendors.length === 0 ? (
        <Card>
          <EmptyState icon={<Building2 className="h-12 w-12" />} title="No vendors" description="Add a vendor to start creating purchase orders." action={<Button onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" /> Add Vendor</Button>} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendors.map((v) => (
            <Card key={v.id} className="p-5 hover:border-primary/40 hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{v.name}</p>
                  {v.code && <p className="text-xs text-muted-foreground">{v.code}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Badge variant={v.is_active ? 'success' : 'outline'}>{v.is_active ? 'Active' : 'Inactive'}</Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(v)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <dl className="mt-3 space-y-1 text-sm">
                {v.contact_name && <div className="flex gap-2"><dt className="text-muted-foreground shrink-0">Contact</dt><dd className="truncate">{v.contact_name}</dd></div>}
                {v.contact_email && <div className="flex gap-2"><dt className="text-muted-foreground shrink-0">Email</dt><dd className="truncate">{v.contact_email}</dd></div>}
                {v.contact_phone && <div className="flex gap-2"><dt className="text-muted-foreground shrink-0">Phone</dt><dd>{v.contact_phone}</dd></div>}
                <div className="flex gap-2"><dt className="text-muted-foreground shrink-0">Terms</dt><dd>{v.payment_terms}</dd></div>
              </dl>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Vendor' : 'New Vendor'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Name *">
                <input value={form.name} onChange={set('name')} placeholder="Vendor name" className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
              </Field>
            </div>
            <Field label="Code">
              <input value={form.code ?? ''} onChange={set('code')} placeholder="e.g. BAKER" className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
            </Field>
            <Field label="Payment Terms">
              <select value={form.payment_terms} onChange={set('payment_terms')} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none">
                {TERMS.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </Field>
            <Field label="Contact Name">
              <input value={form.contact_name ?? ''} onChange={set('contact_name')} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
            </Field>
            <Field label="Contact Email">
              <input type="email" value={form.contact_email ?? ''} onChange={set('contact_email')} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
            </Field>
            <Field label="Contact Phone">
              <input value={form.contact_phone ?? ''} onChange={set('contact_phone')} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
            </Field>
            <Field label="Account Number">
              <input value={form.account_number ?? ''} onChange={set('account_number')} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
            </Field>
            <div className="col-span-2">
              <Field label="Address">
                <input value={form.address ?? ''} onChange={set('address')} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Website">
                <input type="url" value={form.website ?? ''} onChange={set('website')} placeholder="https://..." className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Notes">
                <textarea value={form.notes ?? ''} onChange={set('notes')} rows={2} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none resize-none" />
              </Field>
            </div>
            {editing && (
              <div className="col-span-2 flex items-center gap-2">
                <input type="checkbox" id="is_active" checked={form.is_active ?? true} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} className="rounded" />
                <label htmlFor="is_active" className="text-sm">Active</label>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={isBusy}>{isBusy ? 'Saving…' : (editing ? 'Save Changes' : 'Add Vendor')}</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
