import { z } from 'zod';

export const adminRoleSchema = z.enum(['content', 'support', 'superadmin']);

export type AdminRoleName = z.infer<typeof adminRoleSchema>;

/** Superadmin satisfies every product permission without extra flags. */
export function adminHasPermission(
  roles: readonly AdminRoleName[],
  required: Exclude<AdminRoleName, 'superadmin'>,
): boolean {
  return roles.includes('superadmin') || roles.includes(required);
}

export function adminCanManageAdmins(
  roles: readonly AdminRoleName[],
): boolean {
  return roles.includes('superadmin');
}
