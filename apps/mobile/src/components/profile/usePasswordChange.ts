import { useState } from 'react';
import { changePassword } from '@/lib/auth-client';
import { SETTINGS_SAVE_FAILED_MESSAGE } from './constants/settings-copy';
import { canSubmitPasswordChange, passwordChangeErrorMessage } from './password-change';

export function usePasswordChange() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isChanged, setIsChanged] = useState(false);
  const canSubmit = canSubmitPasswordChange(currentPassword, newPassword) && !isSaving;

  async function submit() {
    if (!canSubmit) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    try {
      const { error } = await changePassword({ currentPassword, newPassword });
      if (error) {
        setErrorMessage(passwordChangeErrorMessage(error));
        return;
      }

      setIsChanged(true);
    } catch {
      setErrorMessage(SETTINGS_SAVE_FAILED_MESSAGE);
    } finally {
      setIsSaving(false);
    }
  }

  return {
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    errorMessage,
    isSaving,
    isChanged,
    canSubmit,
    submit: () => void submit(),
  };
}
