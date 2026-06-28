import type { Permission, UserProfile, UserRole } from "./types";

type Operator = "and" | "or";

/**
 * isPlatformOwner — single source of truth for "is this the SaaS platform operator".
 *
 * Platform-level pages are owner-only. A tenant `admin` / `library_admin` / `superuser` is
 * NOT a platform owner. ONLY the `is_platform_owner` claim or membership in the codevertex
 * platform tenant qualifies. Codevertex membership is verified via the SERVER-returned tenant
 * slug (`tenant_slug`/`tenantSlug`), never the URL `orgSlug`.
 */
export function isPlatformOwner(
  user:
    | {
        isPlatformOwner?: boolean;
        tenant_slug?: string;
        tenantSlug?: string;
      }
    | null
    | undefined,
): boolean {
  if (!user) return false;
  const slug = user.tenant_slug ?? user.tenantSlug ?? "";
  return user.isPlatformOwner === true || slug === "codevertex";
}

// Roles that grant full access to TENANT-level resources. Mirrors the library-api RBAC
// middleware, which bypasses every per-route permission check for platform owners,
// superusers, and tenant admins (the local `library_admin` role).
const FULL_TENANT_ACCESS_ROLES = ["superuser", "admin", "library_admin"];

function hasFullTenantAccess(user: UserProfile | null): boolean {
  if (!user) return false;
  if (user.isSuperUser === true || (user as { isPlatformOwner?: boolean }).isPlatformOwner === true) return true;
  const roles = (user.roles ?? []) as unknown as string[];
  return roles.some((r) => FULL_TENANT_ACCESS_ROLES.includes(r));
}

export function userHasRole(
  user: UserProfile | null,
  roles?: UserRole[] | null,
  operator: Operator = "or",
): boolean {
  if (!roles?.length) return true;
  if (!user) return false;
  if (hasFullTenantAccess(user)) return true;
  const matches = roles.map((role) => user.roles.includes(role));
  return operator === "and" ? matches.every(Boolean) : matches.some(Boolean);
}

/**
 * granted resolves a single Django-style permission code (library.{module}.{action}) against the
 * user's permission set, honoring the wildcard `*` and the rule that `library.{module}.manage`
 * implies every action on that module (mirrors the backend `act`/`view` any-of gates).
 */
function granted(perms: string[], permission: string): boolean {
  if (perms.includes("*")) return true;
  if (perms.includes(permission)) return true;
  const p = permission.split(".");
  if (p.length === 3 && perms.includes(`${p[0]}.${p[1]}.manage`)) return true;
  return false;
}

export function userHasPermission(
  user: UserProfile | null,
  permissions?: Permission[] | null,
  operator: Operator = "or",
): boolean {
  if (!permissions?.length) return true;
  if (!user) return false;
  if (hasFullTenantAccess(user)) return true;
  const perms = (user.permissions ?? []) as unknown as string[];
  const matches = permissions.map((permission) => granted(perms, permission as unknown as string));
  return operator === "and" ? matches.every(Boolean) : matches.some(Boolean);
}

export function userCanAccess(
  user: UserProfile | null,
  options: {
    roles?: UserRole[] | null;
    permissions?: Permission[] | null;
    roleOperator?: Operator;
    permissionOperator?: Operator;
  } = {},
): boolean {
  const { roles, permissions, roleOperator = "or", permissionOperator = "or" } = options;
  return (
    userHasRole(user, roles, roleOperator) &&
    userHasPermission(user, permissions, permissionOperator)
  );
}
