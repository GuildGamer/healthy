import { SetMetadata } from '@nestjs/common';
import type { AdminRoleName } from '@product/contract';

export const ADMIN_AUTH_KEY = 'ADMIN_AUTH';
export const ADMIN_ROLES_KEY = 'ADMIN_ROLES';

export type AdminRoleRequirement =
  | 'any'
  | Exclude<AdminRoleName, 'superadmin'>
  | 'superadmin';

/** Marks a controller as admin-only. Member cookies are rejected. */
export const AdminAuth = (role: AdminRoleRequirement = 'any') =>
  SetMetadata(ADMIN_AUTH_KEY, role);
