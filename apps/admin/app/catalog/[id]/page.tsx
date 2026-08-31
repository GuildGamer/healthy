'use client';

import type { UpdateAdminChallengeInput } from '@product/contract';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChallengeForm } from '@/components/challenge-form';
import { Shell } from '@/components/shell';
import { adminApi } from '@/lib/api';
import { errorMessage } from '@/lib/errors';

export default function EditChallengePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const listQuery = useQuery({
    queryKey: ['admin', 'challenges'],
    queryFn: () => adminApi.listChallenges(),
  });
  const challenge = listQuery.data?.challenges.find(
    (item) => item.id === params.id,
  );
  const mutation = useMutation({
    mutationFn: (input: UpdateAdminChallengeInput) =>
      adminApi.updateChallenge(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'challenges'] });
      router.push('/catalog');
    },
  });

  return (
    <Shell>
      <div className="page stack">
        <h1 style={{ fontFamily: 'Fraunces, Georgia, serif' }}>
          {challenge?.title ?? 'Challenge'}
        </h1>
        {mutation.error ? (
          <p className="error">{errorMessage(mutation.error, 'Could not save')}</p>
        ) : null}
        {challenge ? (
          <div className="card">
            <ChallengeForm
              initial={challenge}
              onSubmit={(input) =>
                mutation.mutate({ ...input, id: challenge.id })
              }
              pending={mutation.isPending}
            />
          </div>
        ) : (
          <p className="muted">Loading…</p>
        )}
      </div>
    </Shell>
  );
}
