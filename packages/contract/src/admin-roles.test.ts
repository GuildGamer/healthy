import { describe, expect, it } from 'vitest';
import { adminCanManageAdmins, adminHasPermission } from './admin-roles.js';

describe('adminHasPermission', () => {
  it('lets superadmin through without the product flag', () => {
    expect(adminHasPermission(['superadmin'], 'content')).toBe(true);
    expect(adminHasPermission(['superadmin'], 'support')).toBe(true);
  });

  it('lets a stacked content+support operator use both desks', () => {
    const roles = ['content', 'support'] as const;

    expect(adminHasPermission(roles, 'content')).toBe(true);
    expect(adminHasPermission(roles, 'support')).toBe(true);
    expect(adminCanManageAdmins(roles)).toBe(false);
  });

  it('denies the other desk', () => {
    expect(adminHasPermission(['content'], 'support')).toBe(false);
    expect(adminHasPermission(['support'], 'content')).toBe(false);
    expect(adminCanManageAdmins(['content', 'support'])).toBe(false);
  });
});
