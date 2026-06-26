'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Users, Shield, Check, Loader2 } from 'lucide-react';
import { useRoles, useAllPermissions, useUpdateRole, useTeam } from '@/hooks/useRBAC';
import { PageHeader, Skeleton, EmptyState } from '@/components/ui/page';
import { Button, Badge, Card } from '@/components/ui/base';
import { CapsuleTabs } from '@/components/ui/tabs';
import type { Role } from '@/lib/api/rbac';
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

  // Group permissions by resource prefix (library.<resource>.<action>).
  const groups = permissions.reduce<Record<string, string[]>>((acc, p) => {
    const resource = p.split('.')[1] ?? 'general';
    (acc[resource] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(groups).map(([resource, perms]) => (
        <Card key={resource}>
          <div className="px-5 py-3 border-b border-border bg-accent/5">
            <p className="text-sm font-bold capitalize">{resource}</p>
          </div>
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
                      const on = draft[r.id]?.has(perm) || r.is_system;
                      return (
                        <td key={r.id} className="px-3 py-2 text-center">
                          <button
                            type="button"
                            disabled={r.is_system}
                            onClick={() => toggle(r.id, perm)}
                            className={`h-6 w-6 rounded-md border inline-flex items-center justify-center transition-colors ${on ? 'bg-primary border-primary text-primary-foreground' : 'border-border hover:border-primary/50'} ${r.is_system ? 'opacity-60 cursor-not-allowed' : ''}`}
                            aria-pressed={on}
                          >
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
        {roles.filter((r) => !r.is_system).map((r) => (
          <Button key={r.id} variant="outline" className="gap-1.5" disabled={updateRole.isPending} onClick={() => saveRole(r)}>
            {updateRole.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save {r.name}
          </Button>
        ))}
      </div>
    </div>
  );
}

export default function TeamPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const { data: roles = [], isLoading: rolesLoading } = useRoles(orgSlug);
  const { data: permissions = [], isLoading: permsLoading } = useAllPermissions(orgSlug);
  const { data: team = [], isLoading: teamLoading } = useTeam(orgSlug);

  const [tab, setTab] = useState<'members' | 'roles'>('members');

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader title="Team & Roles" subtitle="Staff accounts and the RBAC permission matrix" icon={<Shield className="h-5 w-5" />} />

      <CapsuleTabs
        className="mb-6"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'members', label: 'Staff', count: team.length },
          { value: 'roles', label: 'Permission Matrix', count: roles.length },
        ]}
      />

      {tab === 'members' ? (
        <Card>
          {teamLoading ? (
            <div className="p-6 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : team.length === 0 ? (
            <EmptyState icon={<Users className="h-12 w-12" />} title="No staff" description="Staff accounts assigned to this library will appear here." />
          ) : (
            <ul className="divide-y divide-border">
              {team.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0"><Users className="h-4 w-4" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{m.full_name ?? m.email}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {m.roles.map((r) => <Badge key={r} variant="outline">{r}</Badge>)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : rolesLoading || permsLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : roles.length === 0 ? (
        <EmptyState icon={<Shield className="h-12 w-12" />} title="No roles" description="Roles will appear here once configured." />
      ) : (
        <RoleMatrix orgSlug={orgSlug} roles={roles} permissions={permissions} />
      )}
    </div>
  );
}
