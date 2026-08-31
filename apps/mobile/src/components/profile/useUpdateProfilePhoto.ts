import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { updateUser } from '@/lib/auth-client';
import {
  PHOTO_SAVE_FAILED_MESSAGE,
  pickProfilePhoto,
  type ProfilePhotoSource,
} from '@/lib/pick-profile-photo';

export function useUpdateProfilePhoto() {
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async (image: string) => {
      const { error } = await updateUser({ image });
      if (error) {
        throw new Error(PHOTO_SAVE_FAILED_MESSAGE);
      }
    },
    onSuccess: async () => {
      setErrorMessage(null);
      setSheetOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (error: unknown) => {
      setErrorMessage(
        error instanceof Error ? error.message : PHOTO_SAVE_FAILED_MESSAGE,
      );
    },
  });

  async function pickFrom(source: ProfilePhotoSource) {
    setErrorMessage(null);
    const picked = await pickProfilePhoto(source);
    if (picked.status === 'canceled') {
      return;
    }

    if (picked.status === 'failed') {
      setErrorMessage(picked.message);
      return;
    }

    save.mutate(picked.image);
  }

  return {
    sheetOpen,
    openSheet: () => {
      setErrorMessage(null);
      setSheetOpen(true);
    },
    closeSheet: () => setSheetOpen(false),
    pickFrom,
    isSaving: save.isPending,
    errorMessage,
  };
}
