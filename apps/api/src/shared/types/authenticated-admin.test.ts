import { ORPCError } from '@orpc/server';
import { describe, expect, it } from 'vitest';
import {
  requireAdmin,
  requireAdminPermission,
  requireSuperadmin,
  type AuthenticatedAdmin,
} from './authenticated-admin.js';

const operator = (
  roles: AuthenticatedAdmin['roles'],
): AuthenticatedAdmin => ({
  id: 'a1',
  email: 'ops@example.com',
  name: 'Ops',
  roles,
  isActive: true,
});

describe('requireAdminPermission', () => {
  it('lets content+support use both desks', () => {
    const admin = operator(['content', 'support']);

    expect(requireAdminPermission(admin, 'content').id).toBe('a1');
    expect(requireAdminPermission(admin, 'support').id).toBe('a1');
    expect(() => requireSuperadmin(admin)).toThrow(ORPCError);
  });

  it('lets superadmin through without the product flags', () => {
    const admin = operator(['superadmin']);

    expect(requireAdminPermission(admin, 'content').id).toBe('a1');
    expect(requireSuperadmin(admin).id).toBe('a1');
  });

  it('rejects an inactive admin', () => {
    expect(() =>
      requireAdmin({ ...operator(['superadmin']), isActive: false }),
    ).toThrow(ORPCError);
  });
});
