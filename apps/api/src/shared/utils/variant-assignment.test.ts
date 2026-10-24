import { describe, expect, it } from 'vitest';
import { pickVariantId } from './variant-assignment.js';

describe('pickVariantId', () => {
  it('is sticky for the same user and experiment', () => {
    const variants = [
      { id: 'control', weight: 1 },
      { id: 'treatment', weight: 1 },
    ];

    const first = pickVariantId('user-a', 'exp-1', variants);
    const second = pickVariantId('user-a', 'exp-1', variants);

    expect(first).toBe(second);
    expect(first === 'control' || first === 'treatment').toBe(true);
  });

  it('returns null when there is no weight to allocate', () => {
    expect(pickVariantId('user-a', 'exp-1', [])).toBeNull();
    expect(
      pickVariantId('user-a', 'exp-1', [{ id: 'control', weight: 0 }]),
    ).toBeNull();
  });
});
