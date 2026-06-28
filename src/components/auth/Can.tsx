'use client';

import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';

/**
 * Renders children only when the current user holds the permission(s). `perm` is a single
 * Django-style code or an array (any-of). Use for action/row buttons; nav items gate inline.
 */
export function Can({ perm, children, fallback = null }: { perm?: string | string[]; children: ReactNode; fallback?: ReactNode }) {
  const { can } = usePermissions();
  return <>{can(perm) ? children : fallback}</>;
}
