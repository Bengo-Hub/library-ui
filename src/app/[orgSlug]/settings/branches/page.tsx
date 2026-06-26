'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Library, Loader2, Pencil, Plus } from 'lucide-react';
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
    <div className="max-w-4xl mx-auto">
      <Link href={`/${orgSlug}/settings`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to settings
      </Link>
      <PageHeader title="Branches" subtitle="Library branches and locations" icon={<Library className="h-5 w-5" />}
        actions={<Button className="gap-1.5" onClick={openNew}><Plus className="h-4 w-4" /> New Branch</Button>} />

      <Card>
        {isLoading ? (
          <div className="p-6 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : branches.length === 0 ? (
          <EmptyState icon={<Library className="h-12 w-12" />} title="No branches" description="Add your first library branch." action={<Button onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" /> New Branch</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                  <th className="px-5 py-3 font-semibold">Branch</th>
                  <th className="px-5 py-3 font-semibold">Code</th>
                  <th className="px-5 py-3 font-semibold">Contact</th>
                  <th className="px-5 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {branches.map((b) => (
                  <tr key={b.id} className="hover:bg-accent/30">
                    <td className="px-5 py-3">
                      <span className="font-medium">{b.name}</span>
                      {b.is_hq && <Badge variant="default" className="ml-2">HQ</Badge>}
                      {b.address && <p className="text-xs text-muted-foreground">{b.address}</p>}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs">{b.code}</td>
                    <td className="px-5 py-3 text-muted-foreground">{b.phone ?? b.email ?? '—'}</td>
                    <td className="px-5 py-3 text-right"><Button variant="ghost" size="icon" onClick={() => openEdit(b)}><Pencil className="h-4 w-4" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

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
