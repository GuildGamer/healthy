import { colors } from '@product/brand';
import type { ToastTone } from './types';

export function toastRuleColor(tone: ToastTone): string {
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
