'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown, Loader2 } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/base';
import { Field, Select, Textarea } from '@/components/ui/form';
import { Combobox } from '@/components/ui/combobox';
import { useMemberTiers, useCreateTier } from '@/hooks/useMembers';
import { useTeam } from '@/hooks/useRBAC';
import { MEMBER_STATUSES, type Member, type MemberInput, type MemberStatus } from '@/lib/api/members';

const inputCls =
  'w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:outline-none';

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
  const { data: team = [] } = useTeam(orgSlug);
  const createTier = useCreateTier(orgSlug);
  const [form, setForm] = useState<MemberInput>({ first_name: '', last_name: '', status: 'active' });
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (initial) {
      setForm({
        membership_no: initial.membership_no, first_name: initial.first_name, last_name: initial.last_name,
        email: initial.email, phone: initial.phone, tier_id: initial.tier_id, status: initial.status,
        sso_user_id: initial.sso_user_id ?? undefined, crm_customer_id: initial.crm_customer_id ?? undefined,
        expires_at: initial.expires_at ?? undefined, address: initial.address, notes: initial.notes,
      });
      setShowAdvanced(Boolean(initial.sso_user_id || initial.crm_customer_id || initial.address || initial.notes));
    } else {
      setForm({ first_name: '', last_name: '', status: 'active' });
      setShowAdvanced(false);
    }
  }, [initial, open]);

  function set<K extends keyof MemberInput>(key: K, value: MemberInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const tierOptions = useMemo(
    () => tiers.map((t) => ({ value: t.id, label: t.name })),
    [tiers],
  );
  const userOptions = useMemo(
    () => team.map((u) => ({
      value: u.user_id,
      label: u.full_name || u.name || u.email || u.user_id,
      hint: u.email && (u.full_name || u.name) ? u.email : undefined,
    })),
    [team],
  );

  async function handleAddTier(name: string) {
    const tierName = name || 'New tier';
    try {
      const created = await createTier.mutateAsync({
        name: tierName, max_loans: 3, loan_period_days: 14, max_renewals: 2, max_holds: 5, daily_fine_rate: 0,
      });
      set('tier_id', created.id);
      toast.success(`Tier "${tierName}" created`);
    } catch {
      toast.error('Failed to create tier');
    }
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
      className="max-w-3xl"
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
          <input value={form.membership_no ?? ''} onChange={(e) => set('membership_no', e.target.value)} className={inputCls} placeholder="Auto" />
        </Field>
        <Field label="Tier">
          <Combobox
            value={form.tier_id ?? ''}
            onChange={(v) => set('tier_id', v || undefined)}
            options={tierOptions}
            placeholder="— Default —"
            searchPlaceholder="Search tiers…"
            allowClear
            onAddNew={handleAddTier}
            addNewLabel="Create tier"
          />
        </Field>
        <Field label="First name" required>
          <input value={form.first_name} onChange={(e) => set('first_name', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Last name" required>
          <input value={form.last_name} onChange={(e) => set('last_name', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Email">
          <input type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Phone">
          <input value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Status">
          <Select value={form.status ?? 'active'} onChange={(e) => set('status', e.target.value as MemberStatus)}>
            {MEMBER_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        </Field>
        <Field label="Membership expiry">
          <input type="date" value={form.expires_at ? form.expires_at.slice(0, 10) : ''} onChange={(e) => set('expires_at', e.target.value || undefined)} className={inputCls} />
        </Field>
      </div>

      {/* Advanced — long IDs and free-text kept out of the way for the common case. */}
      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        Advanced — linked accounts & notes
      </button>

      {showAdvanced && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border pt-4">
          <Field label="Linked SSO user" hint="Search existing platform users (accounts portal)">
            <Combobox
              value={form.sso_user_id ?? ''}
              onChange={(v) => set('sso_user_id', v || undefined)}
              options={userOptions}
              placeholder="— Not linked —"
              searchPlaceholder="Search users by name or email…"
              emptyText="No matching users"
              allowClear
            />
          </Field>
          <Field label="Linked CRM customer ID" hint="Optional — links to marketflow CRM">
            <input value={form.crm_customer_id ?? ''} onChange={(e) => set('crm_customer_id', e.target.value || undefined)} className={inputCls} />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <input value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
          </Field>
        </div>
      )}
    </Dialog>
  );
}
