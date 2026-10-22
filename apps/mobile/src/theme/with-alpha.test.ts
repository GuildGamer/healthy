import { withAlpha } from './with-alpha';

describe('withAlpha', () => {
  it('appends the opacity as a two-digit hex byte', () => {
    expect(withAlpha('#3DDC97', 0.16)).toBe('#3DDC9729');
    expect(withAlpha('#0B1220', 1)).toBe('#0B1220FF');
    expect(withAlpha('#0B1220', 0)).toBe('#0B122000');
  });

  it('clamps opacity outside 0 to 1', () => {
    expect(withAlpha('#0B1220', 2)).toBe('#0B1220FF');
    expect(withAlpha('#0B1220', -1)).toBe('#0B122000');
  });
});
