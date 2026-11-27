import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
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
  const pendingSource = useRef<ProfilePhotoSource | null>(null);

  const save = useMutation({
    mutationFn: async (image: string | null) => {
      const { error } = await updateUser({ image });
      if (error) {
        throw new Error(PHOTO_SAVE_FAILED_MESSAGE);
      }
    },
    onSuccess: async () => {
      setErrorMessage(null);
      await queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : PHOTO_SAVE_FAILED_MESSAGE);
    },
  });

  function pickFrom(source: ProfilePhotoSource) {
    setErrorMessage(null);
    pendingSource.current = source;
    setSheetOpen(false);
  }

  async function onSheetHidden() {
    const source = pendingSource.current;
    if (!source) {
      return;
    }

    pendingSource.current = null;
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
      pendingSource.current = null;
      setSheetOpen(true);
    },
    closeSheet: () => {
      pendingSource.current = null;
      setSheetOpen(false);
    },
    onSheetHidden,
    pickFrom,
    removePhoto: () => {
      setErrorMessage(null);
      pendingSource.current = null;
      setSheetOpen(false);
      save.mutate(null);
    },
    isSaving: save.isPending,
    errorMessage,
  };
}
