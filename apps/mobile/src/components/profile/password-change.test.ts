import {
  SETTINGS_SAVE_FAILED_MESSAGE,
  WRONG_CURRENT_PASSWORD_MESSAGE,
} from './constants/settings-copy';
import { canSubmitPasswordChange, passwordChangeErrorMessage } from './password-change';

describe('password change', () => {
  it('needs the current password and a new one of at least eight characters', () => {
    expect(canSubmitPasswordChange('', 'longenough')).toBe(false);
    expect(canSubmitPasswordChange('old-password', 'short')).toBe(false);
    expect(canSubmitPasswordChange('old-password', '12345678')).toBe(true);
  });

  it('says plainly when the current password is wrong', () => {
    expect(passwordChangeErrorMessage({ code: 'INVALID_PASSWORD' })).toBe(
      WRONG_CURRENT_PASSWORD_MESSAGE,
    );
  });

  it('repeats the rule when the new password is the wrong length', () => {
    expect(passwordChangeErrorMessage({ code: 'PASSWORD_TOO_SHORT' })).toBe(
      'At least 8 characters.',
    );
  });

  it('never shows the raw server message', () => {
    expect(passwordChangeErrorMessage({ code: 'INTERNAL', message: 'prisma exploded' })).toBe(
      SETTINGS_SAVE_FAILED_MESSAGE,
    );
  });
});
