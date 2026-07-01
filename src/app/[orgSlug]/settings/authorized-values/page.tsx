'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, BookOpen, GripVertical, Loader2, Pencil, Plus, Shield, Trash2 } from 'lucide-react';
import { useAuthorizedValueCategories, useAuthorizedValues, useCreateAuthorizedValue, useUpdateAuthorizedValue, useDeleteAuthorizedValue } from '@/hooks/useAuthorizedValues';
import { PageHeader, EmptyState, Skeleton } from '@/components/ui/page';
import { Button, Badge, Card } from '@/components/ui/base';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/form';
import { type AuthorizedValue, type AuthorizedValueInput } from '@/lib/api/authorizedValues';
import { apiErrorMessage } from '@/lib/api/error-message';

const inputCls = 'w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none';

const EMPTY_AV: AuthorizedValueInput = { category: '', value: '', label: '', description: '', display_order: 0, is_active: true };

const STANDARD_CATEGORIES = ['LOC', 'CCODE', 'NOT_LOAN', 'LOST', 'DAMAGED', 'PAYMENT_TYPE'];

export default function AuthorizedValuesPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;

  const [activeCategory, setActiveCategory] = useState<string>('LOC');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AuthorizedValue | undefined>();
  const [form, setForm] = useState<AuthorizedValueInput>({ ...EMPTY_AV, category: 'LOC' });
  const [deleteTarget, setDeleteTarget] = useState<AuthorizedValue | undefined>();
  const [newCatOpen, setNewCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const { data: extraCategories = [] } = useAuthorizedValueCategories(orgSlug);
  const { data: valuesPage, isLoading } = useAuthorizedValues(orgSlug, activeCategory);

  const createAV = useCreateAuthorizedValue(orgSlug);
  const updateAV = useUpdateAuthorizedValue(orgSlug);
  const deleteAV = useDeleteAuthorizedValue(orgSlug);

  const values = valuesPage?.data ?? [];
  const allCategories = Array.from(new Set([...STANDARD_CATEGORIES, ...extraCategories]));

  function openNew() {
    setEditing(undefined);
    setForm({ ...EMPTY_AV, category: activeCategory });
    setOpen(true);
  }

  function openEdit(av: AuthorizedValue) {
    setEditing(av);
    setForm({ category: av.category, value: av.value, label: av.label ?? '', description: av.description ?? '', display_order: av.display_order, is_active: av.is_active });
    setOpen(true);
  }

  async function save() {
    if (!form.value.trim()) { toast.error('Value is required'); return; }
    try {
      if (editing) {
        await updateAV.mutateAsync({ id: editing.id, data: form });
        toast.success('Value updated');
      } else {
        await createAV.mutateAsync(form);
        toast.success('Value added');
      }
      setOpen(false);
    } catch (e) {
      toast.error(await apiErrorMessage(e, 'Failed to save'));
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteAV.mutateAsync(deleteTarget.id);
      toast.success('Value removed');
      setDeleteTarget(undefined);
    } catch (e) {
      toast.error(await apiErrorMessage(e, 'Cannot delete system value'));
    }
  }

  async function addCategory() {
    if (!newCatName.trim()) return;
    const code = newCatName.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    try {
      await createAV.mutateAsync({ category: code, value: 'DEFAULT', label: 'Default', display_order: 0, is_active: true });
      setActiveCategory(code);
      setNewCatOpen(false);
      setNewCatName('');
    } catch (e) {
      toast.error(await apiErrorMessage(e, 'Failed to create category'));
    }
  }

  const saving = createAV.isPending || updateAV.isPending;

  return (
    <div className="max-w-5xl mx-auto">
      <Link href={`/${orgSlug}/settings`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to settings
      </Link>
      <PageHeader
        title="Authorized Values"
        subtitle="Controlled vocabulary for shelving locations, collection codes, item statuses, and payment types"
        icon={<BookOpen className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setNewCatOpen(true)} className="gap-1.5"><Plus className="h-4 w-4" /> New Category</Button>
            <Button onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" /> Add Value</Button>
          </div>
        }
      />

      <div className="flex gap-6">
        {/* Category sidebar */}
        <div className="w-44 shrink-0">
          <div className="space-y-1">
            {allCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeCategory === cat ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Values table */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : values.length === 0 ? (
            <Card>
              <EmptyState
                icon={<BookOpen className="h-10 w-10" />}
                title={`No values in ${activeCategory}`}
                description="Add values to populate this controlled vocabulary."
                action={<Button onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" /> Add Value</Button>}
              />
            </Card>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="w-8 px-3 py-3" />
                    <th className="text-left px-3 py-3 font-medium text-muted-foreground">Value</th>
                    <th className="text-left px-3 py-3 font-medium text-muted-foreground">Label</th>
                    <th className="text-left px-3 py-3 font-medium text-muted-foreground">Description</th>
                    <th className="px-3 py-3 font-medium text-muted-foreground">Active</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {values.map((av) => (
                    <tr key={av.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-3 text-muted-foreground">
                        <GripVertical className="h-4 w-4" />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-medium">{av.value}</span>
                          {av.is_system && <Shield className="h-3 w-3 text-muted-foreground" aria-label="System value" />}
                        </div>
                      </td>
                      <td className="px-3 py-3">{av.label ?? '—'}</td>
                      <td className="px-3 py-3 text-muted-foreground text-xs">{av.description ?? '—'}</td>
                      <td className="px-3 py-3 text-center">
                        <Badge variant={av.is_active ? 'default' : 'outline'}>{av.is_active ? 'Yes' : 'No'}</Badge>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(av)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {!av.is_system && (
                            <button onClick={() => setDeleteTarget(av)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit value dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Value' : `Add Value — ${activeCategory}`}>
        <div className="space-y-4 p-1">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Value (code)" required>
              <input className={inputCls} value={form.value} disabled={editing?.is_system} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} placeholder="e.g. GEN" />
            </Field>
            <Field label="Display order">
              <input type="number" className={inputCls} value={form.display_order ?? 0} onChange={(e) => setForm((f) => ({ ...f, display_order: Number(e.target.value) }))} />
            </Field>
          </div>
          <Field label="Label">
            <input className={inputCls} value={form.label ?? ''} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="Human-readable name" />
          </Field>
          <Field label="Description">
            <input className={inputCls} value={form.description ?? ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </Field>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.is_active ?? true} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} className="rounded" />
            Active (visible in dropdowns)
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={saving} onClick={save} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editing ? 'Save changes' : 'Add value'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* New category dialog */}
      <Dialog open={newCatOpen} onClose={() => setNewCatOpen(false)} title="New Category">
        <div className="space-y-4 p-1">
          <Field label="Category code (UPPER_CASE)">
            <input className={inputCls} value={newCatName} onChange={(e) => setNewCatName(e.target.value.toUpperCase())} placeholder="e.g. VENDOR_TYPE" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setNewCatOpen(false)}>Cancel</Button>
            <Button disabled={createAV.isPending} onClick={addCategory} className="gap-1.5">
              {createAV.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create category
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(undefined)} title="Remove Value">
        <div className="space-y-4 p-1">
          <p className="text-sm text-muted-foreground">
            Remove <strong className="font-mono">{deleteTarget?.value}</strong>
            {deleteTarget?.label ? ` (${deleteTarget.label})` : ''} from <strong>{activeCategory}</strong>?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(undefined)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteAV.isPending} onClick={confirmDelete} className="gap-1.5">
              {deleteAV.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Remove
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
