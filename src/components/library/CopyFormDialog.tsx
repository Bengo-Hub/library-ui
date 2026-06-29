'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, ScanLine } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/base';
import { Field, Select, Textarea } from '@/components/ui/form';
import { Combobox } from '@/components/ui/combobox';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { useBranches } from '@/hooks/useBranches';
import { useOutletStore } from '@/store/outlet';
import { COPY_STATUSES, type Copy, type CopyInput, type CopyStatus } from '@/lib/api/copies';

const FIELD = 'w-full rounded-lg border border-input bg-transparent px-3 py-2.5 text-sm focus:ring-1 focus:ring-ring focus:outline-none';
const todayISO = () => new Date().toISOString().slice(0, 10);

export function CopyFormDialog({
  open, orgSlug, bibId, initial, saving, onSubmit, onClose,
}: {
  open: boolean;
  orgSlug: string;
  bibId: string;
  initial?: Copy;
  saving?: boolean;
  onSubmit: (data: CopyInput) => void;
  onClose: () => void;
}) {
  const { data: branchesPage } = useBranches(orgSlug);
  const branches = branchesPage?.data ?? [];
  const currentOutlet = useOutletStore((s) => s.outlet);
  const [form, setForm] = useState<CopyInput>({ bib_record_id: bibId, status: 'available' });
  const [scanOpen, setScanOpen] = useState(false);

  // Default branch for a NEW copy: the branch the user is logged in to, else the tenant's
  // default/HQ branch, else the first branch. Acquisition date defaults to today.
  const defaultBranchId =
    currentOutlet?.id
    || branches.find((b) => (b as { is_default?: boolean }).is_default)?.id
    || branches[0]?.id
    || '';

  useEffect(() => {
    if (initial) {
      setForm({
        bib_record_id: initial.bib_record_id, barcode: initial.barcode, call_number: initial.call_number,
        status: initial.status, branch_id: initial.branch_id, shelf_location: initial.shelf_location,
        acquisition_date: initial.acquisition_date, price: initial.price ?? undefined, condition: initial.condition, notes: initial.notes,
      });
    } else {
      setForm({ bib_record_id: bibId, status: 'available', branch_id: defaultBranchId || undefined, acquisition_date: todayISO() });
    }
  }, [initial, bibId, open, defaultBranchId]);

  function set<K extends keyof CopyInput>(key: K, value: CopyInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit() {
    if (!form.barcode?.trim()) { toast.error('A copy barcode is required'); return; }
    onSubmit(form);
  }

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={initial ? 'Edit copy' : 'Add copy'}
      description={initial ? undefined : 'Scan or type the barcode to register a new physical copy.'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={saving} onClick={handleSubmit} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {initial ? 'Save' : 'Add copy'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Barcode" required hint="Each physical copy gets its own unique barcode (separate from the ISBN).">
          <div className="flex flex-col sm:flex-row gap-2">
            <input value={form.barcode ?? ''} onChange={(e) => set('barcode', e.target.value)} placeholder="Copy barcode" className={`${FIELD} sm:flex-1`} />
            <Button type="button" variant="outline" className="gap-1.5 shrink-0" onClick={() => setScanOpen(true)}><ScanLine className="h-4 w-4" /> Scan</Button>
          </div>
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Branch">
            <Combobox
              value={form.branch_id ?? ''}
              onChange={(v) => set('branch_id', v || undefined)}
              options={branches.map((b) => ({ value: b.id, label: b.name }))}
              placeholder="— Select —"
              searchPlaceholder="Search branches…"
              allowClear
            />
          </Field>
          <Field label="Status">
            <Select value={form.status ?? 'available'} onChange={(e) => set('status', e.target.value as CopyStatus)}>
              {COPY_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
          </Field>
          <Field label="Shelf location">
            <input value={form.shelf_location ?? ''} onChange={(e) => set('shelf_location', e.target.value)} className={FIELD} />
          </Field>
          <Field label="Call number" hint="Spine/shelf locator (e.g. 823.914 OGO)">
            <input value={form.call_number ?? ''} onChange={(e) => set('call_number', e.target.value)} className={FIELD} />
          </Field>
          <Field label="Acquisition date">
            <input type="date" value={form.acquisition_date ?? ''} onChange={(e) => set('acquisition_date', e.target.value)} className={FIELD} />
          </Field>
          <Field label="Price">
            <input type="number" step="0.01" value={form.price ?? ''} onChange={(e) => set('price', e.target.value ? Number(e.target.value) : undefined)} className={FIELD} />
          </Field>
        </div>
        <Field label="Notes">
          <Textarea value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
        </Field>
      </div>

      <Dialog open={scanOpen} onClose={() => setScanOpen(false)} title="Scan copy barcode">
        <BarcodeScanner hint="Point the camera at the copy's barcode label." onScan={(text) => { set('barcode', text); setScanOpen(false); }} />
      </Dialog>
    </Dialog>
  );
}
