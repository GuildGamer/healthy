import type { BrandColors } from '@product/brand';
import type { ToastTone } from './types';

export function toastRuleColor(tone: ToastTone, colors: BrandColors): string {
  if (tone === 'success') {
    return colors.accent;
  }

  if (tone === 'error') {
    return colors.danger;
  }

  if (tone === 'warning') {
    return colors.warning;
  }

  return colors.muted;
}
