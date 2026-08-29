import { colors } from '@product/brand';
import { toastRuleColor } from './toast-tone';

describe('toastRuleColor', () => {
  it('uses brand mint for success', () => {
    expect(toastRuleColor('success')).toBe(colors.accent);
  });

  it('uses danger, warning, and muted for the other tones', () => {
    expect(toastRuleColor('error')).toBe(colors.danger);
    expect(toastRuleColor('warning')).toBe(colors.warning);
    expect(toastRuleColor('info')).toBe(colors.muted);
  });
});
