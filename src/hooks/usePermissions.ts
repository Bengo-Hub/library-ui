'use client';

import { useAuthStore } from '@/store/auth';
import { userHasPermission } from '@/lib/auth/permissions';
import type { UserProfile } from '@/lib/auth/types';

/**
 * Service-level (Layer-3) permission checks for the current user. `can` accepts a single
 * Django-style code (library.{module}.{action}) or an array (any-of). Mirrors the backend
 * gates: platform owner / superuser / library_admin bypass, and `*.manage` implies its actions.
 */
export function usePermissions() {
  const user = useAuthStore((s) => s.user);
  function can(perm?: string | string[]): boolean {
    if (!perm) return true;
    const arr = Array.isArray(perm) ? perm : [perm];
    return userHasPermission(user as UserProfile | null, arr as never, 'or');
  }
  return { can, user };
}
