'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Library, Loader2, Mail, MapPin, Pencil, Phone, Plus } from 'lucide-react';
import { useBranches, useCreateBranch, useUpdateBranch } from '@/hooks/useBranches';
import { PageHeader, EmptyState, Skeleton } from '@/components/ui/page';
import { Button, Badge, Card } from '@/components/ui/base';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/form';
import { type Branch, type BranchInput } from '@/lib/api/branches';
import { apiErrorMessage } from '@/lib/api/error-message';

const EMPTY: BranchInput = { name: '', code: '', address: '', phone: '', email: '', is_hq: false };

export default function BranchesPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const { data, isLoading } = useBranches(orgSlug);
  const createBranch = useCreateBranch(orgSlug);
  const updateBranch = useUpdateBranch(orgSlug);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | undefined>();
  const [form, setForm] = useState<BranchInput>(EMPTY);

  const branches = data?.data ?? [];

  function openNew() { setEditing(undefined); setForm(EMPTY); setOpen(true); }
  function openEdit(b: Branch) {
    setEditing(b);
    setForm({ name: b.name, code: b.code, address: b.address, phone: b.phone, email: b.email, is_hq: b.is_hq, opening_hours: b.opening_hours });
    setOpen(true);
  }

  async function save() {
    if (!form.name.trim()) { toast.error('Branch name is required'); return; }
    try {
      if (editing) { await updateBranch.mutateAsync({ id: editing.id, data: form }); toast.success('Branch updated'); }
      else { await createBranch.mutateAsync(form); toast.success('Branch created'); }
      setOpen(false);
    } catch (e) { toast.error(await apiErrorMessage(e, 'Failed to save branch')); }
  }

  function field(label: string, key: keyof BranchInput, type = 'text') {
    return (
      <Field label={label}>
        <input type={type} value={(form[key] as string) ?? ''} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
      </Field>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <Link href={`/${orgSlug}/settings`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to settings
      </Link>
      <PageHeader title="Branches" subtitle="Library branches and locations" icon={<Library className="h-5 w-5" />}
        actions={<Button className="gap-1.5" onClick={openNew}><Plus className="h-4 w-4" /> New Branch</Button>} />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40" />)}</div>
      ) : branches.length === 0 ? (
        <Card><EmptyState icon={<Library className="h-12 w-12" />} title="No branches" description="Add your first library branch." action={<Button onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" /> New Branch</Button>} /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((b) => (
            <Card key={b.id} className="p-5 hover:border-primary/40 hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0"><Library className="h-5 w-5" /></div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold truncate">{b.name}</h3>
                      {b.is_hq && <Badge variant="default">HQ</Badge>}
                    </div>
                    <p className="font-mono text-xs text-muted-foreground">{b.code}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" title="Edit branch" onClick={() => openEdit(b)}><Pencil className="h-4 w-4" /></Button>
              </div>
              <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                {b.address && <p className="flex items-start gap-2"><MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />{b.address}</p>}
                {b.phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 shrink-0" />{b.phone}</p>}
                {b.email && <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 shrink-0" />{b.email}</p>}
                {!b.address && !b.phone && !b.email && <p className="text-xs italic">No contact details</p>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title={editing ? 'Edit branch' : 'New branch'}
        footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} disabled={createBranch.isPending || updateBranch.isPending} className="gap-1.5">{(createBranch.isPending || updateBranch.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}{editing ? 'Save' : 'Create'}</Button></>}>
        <div className="grid grid-cols-2 gap-4">
          {field('Name', 'name')}
          {field('Code', 'code')}
          {field('Phone', 'phone')}
          {field('Email', 'email', 'email')}
          <Field label="Address" className="col-span-2">
            <input value={form.address ?? ''} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
          </Field>
          <label className="col-span-2 flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={!!form.is_hq} onChange={(e) => setForm((f) => ({ ...f, is_hq: e.target.checked }))} className="h-4 w-4 rounded border-input" />
            This is the headquarters branch
          </label>
        </div>
      </Dialog>
    </div>
  );
}
