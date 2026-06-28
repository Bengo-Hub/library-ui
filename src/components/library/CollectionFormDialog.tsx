'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/base';
import { Field } from '@/components/ui/form';
import { useCreateCollection, useUpdateCollection } from '@/hooks/useCatalog';
import type { LibraryCollection } from '@/lib/api/catalog';
import { apiErrorMessage } from '@/lib/api/error-message';

/**
 * Create/edit a tenant-custom collection. Opened from the cataloging collection combobox's
 * "Add new" action (with the typed name prefilled) or to edit an existing custom collection.
 * Global shared defaults are read-only, so editing is disabled for them.
 */
export function CollectionFormDialog({
  open, orgSlug, initial, defaultName, onClose, onSaved,
}: {
  open: boolean;
  orgSlug: string;
  initial?: LibraryCollection;
  defaultName?: string;
  onClose: () => void;
  onSaved?: (c: LibraryCollection) => void;
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [refOnly, setRefOnly] = useState(false);
  const create = useCreateCollection(orgSlug);
  const update = useUpdateCollection(orgSlug);
  const editing = !!initial && !initial.is_global;

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? defaultName ?? '');
      setCode(initial?.code ?? '');
      setRefOnly(initial?.is_reference_only ?? false);
    }
  }, [open, initial, defaultName]);

  const saving = create.isPending || update.isPending;

  async function submit() {
    if (!name.trim()) { toast.error('Name is required'); return; }
    const input = { name: name.trim(), code: code.trim() || undefined, is_reference_only: refOnly };
    try {
      const saved = editing
        ? await update.mutateAsync({ id: initial!.id, input })
        : await create.mutateAsync(input);
      toast.success(editing ? 'Collection updated' : 'Collection added');
      onSaved?.(saved);
      onClose();
    } catch (e) {
      toast.error(await apiErrorMessage(e, 'Failed to save collection'));
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? 'Edit collection' : 'Add collection'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {editing ? 'Save changes' : 'Add collection'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name" required>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Local History"
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2.5 text-sm focus:ring-1 focus:ring-ring focus:outline-none"
          />
        </Field>
        <Field label="Code" hint="Short shelving code (optional)">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. LOC"
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2.5 text-sm focus:ring-1 focus:ring-ring focus:outline-none"
          />
        </Field>
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input type="checkbox" checked={refOnly} onChange={(e) => setRefOnly(e.target.checked)} className="h-4 w-4 rounded border-input" />
          Reference only (copies can&apos;t leave the library)
        </label>
      </div>
    </Dialog>
  );
}
