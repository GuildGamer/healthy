import type { AuthActionResult } from '@/lib/auth-client';
import { MINIMUM_PASSWORD_LENGTH, PASSWORD_RULE } from '@/lib/credentials';
import {
  SETTINGS_SAVE_FAILED_MESSAGE,
  WRONG_CURRENT_PASSWORD_MESSAGE,
} from './constants/settings-copy';

const PASSWORD_LENGTH_CODES = new Set(['PASSWORD_TOO_SHORT', 'PASSWORD_TOO_LONG']);

export function canSubmitPasswordChange(currentPassword: string, newPassword: string): boolean {
  return currentPassword.length > 0 && newPassword.length >= MINIMUM_PASSWORD_LENGTH;
}

/** Better Auth's codes for a refused change; anything else reads as a connection problem. */
export function passwordChangeErrorMessage(error: NonNullable<AuthActionResult['error']>): string {
  if (error.code === 'INVALID_PASSWORD') {
    return WRONG_CURRENT_PASSWORD_MESSAGE;
  }

  if (error.code && PASSWORD_LENGTH_CODES.has(error.code)) {
    return `${PASSWORD_RULE}.`;
  }

  return SETTINGS_SAVE_FAILED_MESSAGE;
}
