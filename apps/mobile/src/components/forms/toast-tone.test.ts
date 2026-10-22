import { darkColors, lightColors } from '@product/brand';
import { toastRuleColor } from './toast-tone';

describe('toastRuleColor', () => {
  it('uses the active palette’s accent for success', () => {
    expect(toastRuleColor('success', lightColors)).toBe(lightColors.accent);
    expect(toastRuleColor('success', darkColors)).toBe(darkColors.accent);
  });

  it('uses danger, warning, and muted for the other tones', () => {
    expect(toastRuleColor('error', lightColors)).toBe(lightColors.danger);
    expect(toastRuleColor('warning', lightColors)).toBe(lightColors.warning);
    expect(toastRuleColor('info', darkColors)).toBe(darkColors.muted);
  });
});
