'use client';

import type { UpsertAdminTipInput } from '@product/contract';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TipForm } from '@/components/tip-form';
import { Shell } from '@/components/shell';
import { adminApi } from '@/lib/api';
import { errorMessage } from '@/lib/errors';

export default function NewTipPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: UpsertAdminTipInput) => adminApi.createTip(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'tips'] });
      router.push('/tips');
    },
  });

  return (
    <Shell>
      <div className="page stack">
        <h1 style={{ fontFamily: 'Fraunces, Georgia, serif' }}>New tip</h1>
        {mutation.error ? (
          <p className="error">{errorMessage(mutation.error, 'Could not save')}</p>
        ) : null}
        <div className="card">
          <TipForm
            onSubmit={(input) => mutation.mutate(input)}
            pending={mutation.isPending}
          />
        </div>
      </div>
    </Shell>
  );
}
