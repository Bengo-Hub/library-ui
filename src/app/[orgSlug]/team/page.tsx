'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Users, Shield, Check, Loader2, Plus, Trash2, KeyRound, Pencil, Building2, CreditCard } from 'lucide-react';
import { useRoles, useAllPermissions, useUpdateRole, useTeam, useAssignRole, useCreateRole, useDeleteRole, useBranches, useAssignBranches } from '@/hooks/useRBAC';
import { pinApi } from '@/lib/api/pin';
import { PageHeader, Skeleton, EmptyState } from '@/components/ui/page';
import { Button, Badge, Card } from '@/components/ui/base';
import { CapsuleTabs } from '@/components/ui/tabs';
import { Dialog } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { Role, TeamMember } from '@/lib/api/rbac';
import { apiErrorMessage } from '@/lib/api/error-message';

function prettyPerm(p: string) {
  return p.replace(/^library\./, '').replace(/[._]/g, ' ');
}

function RoleMatrix({ orgSlug, roles, permissions }: { orgSlug: string; roles: Role[]; permissions: string[] }) {
  const updateRole = useUpdateRole(orgSlug);
  const [draft, setDraft] = useState<Record<string, Set<string>>>(() =>
    Object.fromEntries(roles.map((r) => [r.id, new Set(r.permissions)])),
  );

  function toggle(roleId: string, perm: string) {
    setDraft((d) => {
      const next = new Set(d[roleId] ?? []);
      if (next.has(perm)) next.delete(perm); else next.add(perm);
      return { ...d, [roleId]: next };
    });
  }
  async function saveRole(role: Role) {
    try {
      await updateRole.mutateAsync({ id: role.id, permissions: Array.from(draft[role.id] ?? []) });
      toast.success(`${role.name} permissions saved`);
    } catch (e) { toast.error(await apiErrorMessage(e, 'Failed to save role')); }
  }

  const groups = permissions.reduce<Record<string, string[]>>((acc, p) => {
    const resource = (typeof p === 'string' ? p.split('.')[1] : undefined) ?? 'general';
    (acc[resource] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(groups).map(([resource, perms]) => (
        <Card key={resource}>
          <div className="px-5 py-3 border-b border-border bg-accent/5"><p className="text-sm font-bold capitalize">{resource}</p></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                  <th className="px-5 py-2.5 font-semibold">Permission</th>
                  {roles.map((r) => <th key={r.id} className="px-3 py-2.5 font-semibold text-center">{r.name}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {perms.map((perm) => (
                  <tr key={perm} className="hover:bg-accent/20">
                    <td className="px-5 py-2 capitalize text-muted-foreground">{prettyPerm(perm)}</td>
                    {roles.map((r) => {
                      const on = draft[r.id]?.has(perm) || (r.permissions ?? []).includes('*');
                      const locked = r.is_system || (r.permissions ?? []).includes('*');
                      return (
                        <td key={r.id} className="px-3 py-2 text-center">
                          <button type="button" disabled={locked} onClick={() => toggle(r.id, perm)}
                            className={`h-6 w-6 rounded-md border inline-flex items-center justify-center transition-colors ${on ? 'bg-primary border-primary text-primary-foreground' : 'border-border hover:border-primary/50'} ${locked ? 'opacity-60 cursor-not-allowed' : ''}`}
                            aria-pressed={on}>
                            {on && <Check className="h-3.5 w-3.5" />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
      <div className="flex flex-wrap gap-2 justify-end">
        {roles.filter((r) => !r.is_system && !(r.permissions ?? []).includes('*')).map((r) => (
          <Button key={r.id} variant="outline" className="gap-1.5" disabled={updateRole.isPending} onClick={() => saveRole(r)}>
            {updateRole.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save {r.name}
          </Button>
        ))}
      </div>
    </div>
  );
}

export default function TeamPage() {
  const orgSlug = useParams()?.orgSlug as string;
  const { data: roles = [], isLoading: rolesLoading } = useRoles(orgSlug);
  const { data: permissions = [], isLoading: permsLoading } = useAllPermissions(orgSlug);
  const { data: team = [], isLoading: teamLoading } = useTeam(orgSlug);
  const assignRole = useAssignRole(orgSlug);
  const createRole = useCreateRole(orgSlug);
  const deleteRole = useDeleteRole(orgSlug);
  const { data: branches = [] } = useBranches(orgSlug);
  const assignBranches = useAssignBranches(orgSlug);

  const [tab, setTab] = useState<'members' | 'roles'>('members');
  const [editMember, setEditMember] = useState<TeamMember | null>(null);
  const [memberRoles, setMemberRoles] = useState<Set<string>>(new Set());
  const [pinMember, setPinMember] = useState<TeamMember | null>(null);
  const [pin, setPin] = useState('');
  const [branchMember, setBranchMember] = useState<TeamMember | null>(null);
  const [memberBranches, setMemberBranches] = useState<Set<string>>(new Set());
  const [newRoleOpen, setNewRoleOpen] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', description: '' });
  const [toDelete, setToDelete] = useState<Role | null>(null);

  async function downloadStaffCard(m: TeamMember) {
    try {
      const blob = await pinApi.staffCardPdf(orgSlug, m.user_id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `staff-card-${m.user_id}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) { toast.error(await apiErrorMessage(e, 'Failed to generate staff card')); }
  }

  function openEdit(m: TeamMember) { setEditMember(m); setMemberRoles(new Set(m.roles)); }
  async function saveMemberRoles() {
    if (!editMember) return;
    try {
      await assignRole.mutateAsync({ userId: editMember.user_id, roles: Array.from(memberRoles) });
      toast.success('Roles updated'); setEditMember(null);
    } catch (e) { toast.error(await apiErrorMessage(e, 'Failed to update roles')); }
  }
  function openBranches(m: TeamMember) { setBranchMember(m); setMemberBranches(new Set(m.branch_ids ?? [])); }
  async function saveBranches() {
    if (!branchMember) return;
    try {
      await assignBranches.mutateAsync({ userId: branchMember.user_id, branchIds: Array.from(memberBranches) });
      toast.success('Branches updated'); setBranchMember(null);
    } catch (e) { toast.error(await apiErrorMessage(e, 'Failed to update branches')); }
  }
  async function savePin() {
    if (!pinMember || pin.length < 4) { toast.error('PIN must be at least 4 digits'); return; }
    try {
      await pinApi.setPin(orgSlug, pinMember.user_id, pin);
      toast.success(`PIN set for ${pinMember.name ?? pinMember.email}`); setPinMember(null); setPin('');
    } catch (e) { toast.error(await apiErrorMessage(e, 'Failed to set PIN')); }
  }
  async function doCreateRole() {
    if (!newRole.name.trim()) { toast.error('Role name is required'); return; }
    try {
      await createRole.mutateAsync({ name: newRole.name.trim(), description: newRole.description });
      toast.success('Role created'); setNewRoleOpen(false); setNewRole({ name: '', description: '' });
    } catch (e) { toast.error(await apiErrorMessage(e, 'Failed to create role')); }
  }
  async function doDeleteRole() {
    if (!toDelete) return;
    try { await deleteRole.mutateAsync(toDelete.id); toast.success('Role deleted'); setToDelete(null); }
    catch (e) { toast.error(await apiErrorMessage(e, 'Failed to delete role')); }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Team & Roles"
        subtitle="Staff accounts, PINs, and the RBAC permission matrix"
        icon={<Shield className="h-5 w-5" />}
        actions={tab === 'roles' ? <Button className="gap-1.5" onClick={() => setNewRoleOpen(true)}><Plus className="h-4 w-4" /> New role</Button> : undefined}
      />

      <CapsuleTabs className="mb-6" value={tab} onChange={(v) => setTab(v as 'members' | 'roles')}
        options={[{ value: 'members', label: 'Staff', count: team.length }, { value: 'roles', label: 'Permission Matrix', count: roles.length }]} />

      {tab === 'members' ? (
        <Card>
          {teamLoading ? (
            <div className="p-6 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : team.length === 0 ? (
            <EmptyState icon={<Users className="h-12 w-12" />} title="No staff yet" description="Staff are provisioned on first SSO login. Once they sign in, assign roles and PINs here." />
          ) : (
            <ul className="divide-y divide-border">
              {team.map((m) => (
                <li key={m.user_id} className="flex items-center gap-3 px-5 py-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0"><Users className="h-4 w-4" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{m.name ?? m.full_name ?? m.email}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                  </div>
                  <div className="hidden sm:flex flex-wrap gap-1.5 justify-end max-w-[40%]">
                    {m.roles.map((r) => <Badge key={r} variant="outline">{r}</Badge>)}
                    {m.has_pin && <Badge variant="success" className="gap-1"><KeyRound className="h-3 w-3" />PIN</Badge>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openEdit(m)}><Pencil className="h-3.5 w-3.5" /> Roles</Button>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openBranches(m)}><Building2 className="h-3.5 w-3.5" /> Branches</Button>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setPinMember(m); setPin(''); }}><KeyRound className="h-3.5 w-3.5" /> PIN</Button>
                    <Button size="sm" variant="outline" className="gap-1.5" title="Download staff card" onClick={() => downloadStaffCard(m)}><CreditCard className="h-3.5 w-3.5" /> Card</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : rolesLoading || permsLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : roles.length === 0 ? (
        <EmptyState icon={<Shield className="h-12 w-12" />} title="No roles" description="Create a role to start assigning permissions." action={<Button className="gap-1.5" onClick={() => setNewRoleOpen(true)}><Plus className="h-4 w-4" /> New role</Button>} />
      ) : (
        <>
          <RoleMatrix orgSlug={orgSlug} roles={roles} permissions={permissions} />
          <div className="mt-4 flex flex-wrap gap-2">
            {roles.filter((r) => !r.is_system).map((r) => (
              <Button key={r.id} size="sm" variant="ghost" className="gap-1.5 text-destructive" onClick={() => setToDelete(r)}><Trash2 className="h-3.5 w-3.5" /> Delete {r.name}</Button>
            ))}
          </div>
        </>
      )}

      {/* Edit member roles */}
      <Dialog open={!!editMember} onClose={() => setEditMember(null)} title={`Roles · ${editMember?.name ?? editMember?.email ?? ''}`}
        footer={<><Button variant="outline" onClick={() => setEditMember(null)}>Cancel</Button><Button onClick={saveMemberRoles} disabled={assignRole.isPending} className="gap-1.5">{assignRole.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Save</Button></>}>
        <div className="space-y-2">
          {roles.map((r) => {
            const on = memberRoles.has(r.name);
            return (
              <button key={r.id} type="button" onClick={() => setMemberRoles((s) => { const n = new Set(s); if (n.has(r.name)) n.delete(r.name); else n.add(r.name); return n; })}
                className={`w-full flex items-center gap-3 rounded-xl border px-4 py-2.5 text-left transition-colors ${on ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}>
                <span className={`h-5 w-5 rounded-md border inline-flex items-center justify-center ${on ? 'bg-primary border-primary text-primary-foreground' : 'border-border'}`}>{on && <Check className="h-3.5 w-3.5" />}</span>
                <span className="text-sm font-medium">{r.name}</span>
                {r.description && <span className="text-xs text-muted-foreground truncate">{r.description}</span>}
              </button>
            );
          })}
        </div>
      </Dialog>

      {/* Assign branches */}
      <Dialog open={!!branchMember} onClose={() => setBranchMember(null)} title={`Branches · ${branchMember?.name ?? branchMember?.email ?? ''}`}
        description="Branches this staff member may log in to. Admins (library_admin) can log in to any branch regardless."
        footer={<><Button variant="outline" onClick={() => setBranchMember(null)}>Cancel</Button><Button onClick={saveBranches} disabled={assignBranches.isPending} className="gap-1.5">{assignBranches.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Save</Button></>}>
        <div className="space-y-2">
          {branches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No branches yet. Add branches under Settings → Branches.</p>
          ) : branches.map((b) => {
            const on = memberBranches.has(b.id);
            return (
              <button key={b.id} type="button" onClick={() => setMemberBranches((s) => { const n = new Set(s); if (n.has(b.id)) n.delete(b.id); else n.add(b.id); return n; })}
                className={`w-full flex items-center gap-3 rounded-xl border px-4 py-2.5 text-left transition-colors ${on ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}>
                <span className={`h-5 w-5 rounded-md border inline-flex items-center justify-center ${on ? 'bg-primary border-primary text-primary-foreground' : 'border-border'}`}>{on && <Check className="h-3.5 w-3.5" />}</span>
                <span className="text-sm font-medium flex-1">{b.name}</span>
                <span className="text-xs text-muted-foreground">{b.code}</span>
              </button>
            );
          })}
        </div>
      </Dialog>

      {/* Set PIN */}
      <Dialog open={!!pinMember} onClose={() => setPinMember(null)} title={`Set desk PIN · ${pinMember?.name ?? pinMember?.email ?? ''}`}
        footer={<><Button variant="outline" onClick={() => setPinMember(null)}>Cancel</Button><Button onClick={savePin} className="gap-1.5">Save PIN</Button></>}>
        <p className="text-sm text-muted-foreground mb-3">A 4–6 digit PIN lets this staff member sign in fast at the circulation desk / self-checkout (supplements SSO).</p>
        <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="••••"
          className="w-full h-12 rounded-xl border border-input bg-card px-4 text-center text-2xl tracking-[0.4em] font-bold focus:ring-1 focus:ring-ring focus:outline-none" />
      </Dialog>

      {/* New role */}
      <Dialog open={newRoleOpen} onClose={() => setNewRoleOpen(false)} title="New role"
        footer={<><Button variant="outline" onClick={() => setNewRoleOpen(false)}>Cancel</Button><Button onClick={doCreateRole} disabled={createRole.isPending} className="gap-1.5">{createRole.isPending && <Loader2 className="h-4 w-4 animate-spin" />}Create</Button></>}>
        <div className="space-y-3">
          <input value={newRole.name} onChange={(e) => setNewRole((s) => ({ ...s, name: e.target.value }))} placeholder="Role name (e.g. cataloguer)" className="w-full h-11 rounded-xl border border-input bg-card px-3 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
          <input value={newRole.description} onChange={(e) => setNewRole((s) => ({ ...s, description: e.target.value }))} placeholder="Description (optional)" className="w-full h-11 rounded-xl border border-input bg-card px-3 text-sm focus:ring-1 focus:ring-ring focus:outline-none" />
          <p className="text-xs text-muted-foreground">After creating, set its permissions in the matrix and Save.</p>
        </div>
      </Dialog>

      <ConfirmDialog open={!!toDelete} onCancel={() => setToDelete(null)} onConfirm={doDeleteRole}
        title={`Delete role "${toDelete?.name}"?`} description="Members keeping this role lose its permissions. System roles cannot be deleted." variant="danger" confirmLabel="Delete role" />
    </div>
  );
}
