export type UserRole = "staff" | "librarian" | "admin" | "superuser";

export type Permission =
  // Catalog (bib records, authors, publishers, subjects, collections)
  | "library.catalog.add"
  | "library.catalog.read"
  | "library.catalog.change"
  | "library.catalog.delete"
  | "library.catalog.manage"
  // Copies / holdings
  | "library.copies.add"
  | "library.copies.read"
  | "library.copies.change"
  | "library.copies.delete"
  | "library.copies.manage"
  // Circulation (checkout, return, renew)
  | "library.circulation.add"
  | "library.circulation.read"
  | "library.circulation.change"
  | "library.circulation.manage"
  // Holds / reservations
  | "library.holds.add"
  | "library.holds.read"
  | "library.holds.change"
  | "library.holds.delete"
  | "library.holds.manage"
  // Members
  | "library.members.add"
  | "library.members.read"
  | "library.members.change"
  | "library.members.delete"
  | "library.members.manage"
  // Fines
  | "library.fines.read"
  | "library.fines.waive"
  | "library.fines.collect"
  | "library.fines.manage"
  // Ebooks
  | "library.ebooks.add"
  | "library.ebooks.read"
  | "library.ebooks.change"
  | "library.ebooks.delete"
  | "library.ebooks.manage"
  // Branches
  | "library.branches.add"
  | "library.branches.read"
  | "library.branches.change"
  | "library.branches.manage"
  // Reports
  | "library.reports.read"
  | "library.reports.manage"
  // Settings
  | "library.settings.read"
  | "library.settings.change"
  | "library.settings.manage"
  // Platform
  | "library.platform.read"
  | "library.platform.manage"
  // Users
  | "library.users.manage";

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  roles: UserRole[];
  permissions: Permission[];
  organizationId: string;
  tenantId: string;
  tenantSlug: string;
  isPlatformOwner?: boolean;
  isSuperUser?: boolean;
}
