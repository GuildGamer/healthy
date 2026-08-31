'use client';

import type { UpsertAdminChallengeInput } from '@product/contract';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChallengeForm } from '@/components/challenge-form';
import { Shell } from '@/components/shell';
import { adminApi } from '@/lib/api';
import { errorMessage } from '@/lib/errors';

export default function NewChallengePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: UpsertAdminChallengeInput) =>
      adminApi.createChallenge(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'challenges'] });
      router.push('/catalog');
    },
  });

  return (
    <Shell>
      <div className="page stack">
        <h1 style={{ fontFamily: 'Fraunces, Georgia, serif' }}>New challenge</h1>
        {mutation.error ? (
          <p className="error">{errorMessage(mutation.error, 'Could not save')}</p>
        ) : null}
        <div className="card">
          <ChallengeForm
            onSubmit={(input) => mutation.mutate(input)}
            pending={mutation.isPending}
          />
        </div>
      </div>
    </Shell>
  );
}
