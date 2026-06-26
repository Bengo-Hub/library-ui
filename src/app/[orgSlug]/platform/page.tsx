'use client';

import { useParams } from 'next/navigation';
import { Shield } from 'lucide-react';
import { PageHeader } from '@/components/ui/page';
import { Card } from '@/components/ui/base';
import { useMe } from '@/hooks/useMe';
import { isPlatformOwner } from '@/lib/auth/permissions';
import { useAuthStore } from '@/store/auth';

export default function PlatformPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const user = useAuthStore((s) => s.user);
  const { user: meUser } = useMe();

  const owner = isPlatformOwner(user) || isPlatformOwner(meUser as any);

  if (!owner) {
    return (
      <div className="max-w-3xl mx-auto">
        <PageHeader title="Platform Admin" subtitle="Platform-owner only" icon={<Shield className="h-5 w-5" />} />
        <Card><div className="p-8 text-center text-sm text-muted-foreground">You don&apos;t have access to platform administration.</div></Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader title="Platform Admin" subtitle="Cross-tenant library administration" icon={<Shield className="h-5 w-5" />} />
      <Card>
        <div className="p-8 text-center text-sm text-muted-foreground">
          Platform-level library administration (all-tenant catalogs, license pools, usage) for <span className="font-semibold text-foreground">{orgSlug}</span>.
          These tools surface here for the platform owner.
        </div>
      </Card>
    </div>
  );
}
