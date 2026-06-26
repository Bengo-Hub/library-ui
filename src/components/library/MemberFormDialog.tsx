'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/base';
import { Field, Select, Textarea } from '@/components/ui/form';
import { useMemberTiers } from '@/hooks/useMembers';
import { MEMBER_STATUSES, type Member, type MemberInput, type MemberStatus } from '@/lib/api/members';

export function MemberFormDialog({
  open, orgSlug, initial, saving, onSubmit, onClose,
}: {
  open: boolean;
  orgSlug: string;
  initial?: Member;
  saving?: boolean;
  onSubmit: (data: MemberInput) => void;
  onClose: () => void;
}) {
  const { data: tiers = [] } = useMemberTiers(orgSlug);
  const [form, setForm] = useState<MemberInput>({ first_name: '', last_name: '', status: 'active' });

  useEffect(() => {
    if (initial) {
      setForm({
        membership_no: initial.membership_no, first_name: initial.first_name, last_name: initial.last_name,
        email: initial.email, phone: initial.phone, tier_id: initial.tier_id, status: initial.status,
        sso_user_id: initial.sso_user_id ?? undefined, crm_customer_id: initial.crm_customer_id ?? undefined,
        expires_at: initial.expires_at ?? undefined, address: initial.address, notes: initial.notes,
      });
    } else {
      setForm({ first_name: '', last_name: '', status: 'active' });
    }
  }, [initial, open]);

  function set<K extends keyof MemberInput>(key: K, value: MemberInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit() {
    if (!form.first_name.trim() || !form.last_name.trim()) { toast.error('First and last name are required'); return; }
    onSubmit(form);
  }

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={initial ? 'Edit member' : 'New member'}
      className="max-w-2xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={saving} onClick={handleSubmit} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {initial ? 'Save' : 'Create member'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Membership no." hint="Leave blank to auto-generate">
          <input value={form.membership_no ?? ''} onChange={(e) => set('membership_no', e.target.value)} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
        </Field>
        <Field label="Tier">
          <Select value={form.tier_id ?? ''} onChange={(e) => set('tier_id', e.target.value || undefined)}>
            <option value="">— Default —</option>
            {tiers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </Field>
        <Field label="First name" required>
          <input value={form.first_name} onChange={(e) => set('first_name', e.target.value)} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
        </Field>
        <Field label="Last name" required>
          <input value={form.last_name} onChange={(e) => set('last_name', e.target.value)} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
        </Field>
        <Field label="Email">
          <input type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
        </Field>
        <Field label="Phone">
          <input value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
        </Field>
        <Field label="Status">
          <Select value={form.status ?? 'active'} onChange={(e) => set('status', e.target.value as MemberStatus)}>
            {MEMBER_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        </Field>
        <Field label="Membership expiry">
          <input type="date" value={form.expires_at ? form.expires_at.slice(0, 10) : ''} onChange={(e) => set('expires_at', e.target.value || undefined)} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
        </Field>
        <Field label="Linked SSO user ID" hint="Optional — links to the accounts portal">
          <input value={form.sso_user_id ?? ''} onChange={(e) => set('sso_user_id', e.target.value || undefined)} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
        </Field>
        <Field label="Linked CRM customer ID" hint="Optional — links to marketflow CRM">
          <input value={form.crm_customer_id ?? ''} onChange={(e) => set('crm_customer_id', e.target.value || undefined)} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
        </Field>
        <Field label="Address" className="sm:col-span-2">
          <input value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <Textarea value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
        </Field>
      </div>
    </Dialog>
  );
}
