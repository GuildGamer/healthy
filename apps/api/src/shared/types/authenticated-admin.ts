import { ORPCError } from '@orpc/server';
import {
  adminCanManageAdmins,
  adminHasPermission,
  type AdminRoleName,
} from '@product/contract';

export type AuthenticatedAdmin = {
  id: string;
  email: string;
  name: string;
  roles: AdminRoleName[];
  isActive: boolean;
};

export function requireAdmin(
  currentAdmin: AuthenticatedAdmin | null | undefined,
): AuthenticatedAdmin {
  if (currentAdmin && currentAdmin.isActive) {
    return currentAdmin;
  }

  throw new ORPCError('UNAUTHORIZED', {
    message: 'Authentication required',
  });
}

export function requireAdminPermission(
  currentAdmin: AuthenticatedAdmin | null | undefined,
  required: Exclude<AdminRoleName, 'superadmin'>,
): AuthenticatedAdmin {
  const admin = requireAdmin(currentAdmin);

  if (!adminHasPermission(admin.roles, required)) {
    throw new ORPCError('FORBIDDEN', {
      message: 'You do not have permission to do that',
    });
  }

  return admin;
}

export function requireSuperadmin(
  currentAdmin: AuthenticatedAdmin | null | undefined,
): AuthenticatedAdmin {
  const admin = requireAdmin(currentAdmin);

  if (!adminCanManageAdmins(admin.roles)) {
    throw new ORPCError('FORBIDDEN', {
      message: 'You do not have permission to do that',
    });
  }

  return admin;
}
