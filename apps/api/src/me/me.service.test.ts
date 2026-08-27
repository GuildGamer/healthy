import { describe, expect, it } from 'vitest';
import { MeService } from '../src/me/me.service';

describe('MeService', () => {
  it('returns the authenticated user', () => {
    const service = new MeService();
    expect(
      service.getMe({ id: 'u1', email: 'a@b.co', name: 'Ada' }),
    ).toEqual({ id: 'u1', email: 'a@b.co', name: 'Ada' });
  });
});
