'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, CalendarDays, Loader2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useHolidays, useCreateHoliday, useUpdateHoliday, useDeleteHoliday } from '@/hooks/useHolidays';
import { useBranches } from '@/hooks/useBranches';
import { PageHeader, EmptyState, Skeleton } from '@/components/ui/page';
import { Button, Badge, Card } from '@/components/ui/base';
import { Dialog } from '@/components/ui/dialog';
import { Field, Select } from '@/components/ui/form';
import { type LibraryHoliday, type HolidayInput } from '@/lib/api/holidays';
import { apiErrorMessage } from '@/lib/api/error-message';

const inputCls = 'w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none';

const EMPTY: HolidayInput = { branch_id: null, holiday_date: '', description: '', is_recurring: false };

function formatDate(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function CalendarPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;

  const year = new Date().getFullYear();
  const [yearFilter, setYearFilter] = useState(year);
  const [branchFilter, setBranchFilter] = useState<string | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LibraryHoliday | undefined>();
  const [form, setForm] = useState<HolidayInput>(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState<LibraryHoliday | undefined>();

  const { data: page, isLoading } = useHolidays(orgSlug, { branch_id: branchFilter, year: yearFilter });
  const { data: branchesPage } = useBranches(orgSlug);

  const createHoliday = useCreateHoliday(orgSlug);
  const updateHoliday = useUpdateHoliday(orgSlug);
  const deleteHoliday = useDeleteHoliday(orgSlug);

  const holidays = page?.data ?? [];
  const branches = branchesPage?.data ?? [];

  function openNew() { setEditing(undefined); setForm({ ...EMPTY }); setOpen(true); }
  function openEdit(h: LibraryHoliday) {
    setEditing(h);
    setForm({
      branch_id: h.branch_id,
      holiday_date: h.holiday_date.slice(0, 10),
      description: h.description ?? '',
      is_recurring: h.is_recurring,
    });
    setOpen(true);
  }

  async function save() {
    if (!form.holiday_date) { toast.error('Date is required'); return; }
    try {
      if (editing) {
        await updateHoliday.mutateAsync({ id: editing.id, data: form });
        toast.success('Holiday updated');
      } else {
        await createHoliday.mutateAsync(form);
        toast.success('Holiday added');
      }
      setOpen(false);
    } catch (e) {
      toast.error(await apiErrorMessage(e, 'Failed to save holiday'));
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteHoliday.mutateAsync(deleteTarget.id);
      toast.success('Holiday removed');
      setDeleteTarget(undefined);
    } catch (e) {
      toast.error(await apiErrorMessage(e, 'Failed to delete holiday'));
    }
  }

  function branchName(id: string | null) {
    if (!id) return 'All branches';
    return branches.find((b) => b.id === id)?.name ?? id.slice(0, 8);
  }

  const saving = createHoliday.isPending || updateHoliday.isPending;

  return (
    <div className="max-w-4xl mx-auto">
      <Link href={`/${orgSlug}/settings`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to settings
      </Link>
      <PageHeader
        title="Holiday Calendar"
        subtitle="Closed days that affect due-date calculation"
        icon={<CalendarDays className="h-5 w-5" />}
        actions={<Button className="gap-1.5" onClick={openNew}><Plus className="h-4 w-4" /> Add Holiday</Button>}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Year:</span>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(Number(e.target.value))}
            className="rounded-lg border border-input bg-transparent px-2 py-1 text-sm"
          >
            {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Branch:</span>
          <select
            value={branchFilter ?? ''}
            onChange={(e) => setBranchFilter(e.target.value || undefined)}
            className="rounded-lg border border-input bg-transparent px-2 py-1 text-sm"
          >
            <option value="">All branches</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : holidays.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CalendarDays className="h-12 w-12" />}
            title="No holidays"
            description="Add closure days to enable calendar-aware due-date calculation."
            action={<Button onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" /> Add Holiday</Button>}
          />
        </Card>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Description</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Branch</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Recurring</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {holidays.map((h) => (
                <tr key={h.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-mono font-medium">{formatDate(h.holiday_date)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{h.description || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={h.branch_id ? 'default' : 'outline'}>{branchName(h.branch_id)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {h.is_recurring ? <RefreshCw className="h-4 w-4 text-primary mx-auto" /> : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(h)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeleteTarget(h)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / edit dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Holiday' : 'Add Holiday'}>
        <div className="space-y-4 p-1">
          <Field label="Date">
            <input type="date" className={inputCls} value={form.holiday_date} onChange={(e) => setForm((f) => ({ ...f, holiday_date: e.target.value }))} />
          </Field>
          <Field label="Description">
            <input className={inputCls} value={form.description ?? ''} placeholder="e.g. New Year's Day" onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </Field>
          <Field label="Branch (leave blank for all)">
            <Select value={form.branch_id ?? ''} onChange={(e) => setForm((f) => ({ ...f, branch_id: e.target.value || null }))}>
              <option value="">All branches</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.is_recurring ?? false} onChange={(e) => setForm((f) => ({ ...f, is_recurring: e.target.checked }))} className="rounded" />
            Repeat every year (recurring)
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={saving} onClick={save} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editing ? 'Save changes' : 'Add holiday'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(undefined)} title="Remove Holiday">
        <div className="space-y-4 p-1">
          <p className="text-sm text-muted-foreground">
            Remove <strong>{formatDate(deleteTarget?.holiday_date ?? '')}</strong>
            {deleteTarget?.description ? ` (${deleteTarget.description})` : ''}? Due dates will no longer skip this day.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(undefined)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteHoliday.isPending} onClick={confirmDelete} className="gap-1.5">
              {deleteHoliday.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Remove
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
