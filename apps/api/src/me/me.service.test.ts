import { describe, expect, it } from 'vitest';
import { ORPCError } from '@orpc/server';
import { MeService } from './me.service.js';

describe('MeService', () => {
  it('returns the authenticated user', () => {
    const service = new MeService();
    expect(
      service.getMe({ id: 'u1', email: 'a@b.co', name: 'Ada' }),
    ).toEqual({ id: 'u1', email: 'a@b.co', name: 'Ada' });
  });

  it('rejects unauthenticated callers with ORPC UNAUTHORIZED', () => {
    const service = new MeService();
    expect(() => service.getMe(null)).toThrow(ORPCError);
  });
});
