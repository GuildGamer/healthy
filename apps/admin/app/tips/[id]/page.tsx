'use client';

import type { UpdateAdminTipInput } from '@product/contract';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TipForm } from '@/components/tip-form';
import { Shell } from '@/components/shell';
import { adminApi } from '@/lib/api';
import { errorMessage } from '@/lib/errors';

export default function EditTipPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const listQuery = useQuery({
    queryKey: ['admin', 'tips'],
    queryFn: () => adminApi.listTips(),
  });
  const tip = listQuery.data?.tips.find((item) => item.id === params.id);
  const mutation = useMutation({
    mutationFn: (input: UpdateAdminTipInput) => adminApi.updateTip(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'tips'] });
      router.push('/tips');
    },
  });

  return (
    <Shell>
      <div className="page stack">
        <h1 style={{ fontFamily: 'Fraunces, Georgia, serif' }}>
          {tip?.title ?? 'Tip'}
        </h1>
        {mutation.error ? (
          <p className="error">{errorMessage(mutation.error, 'Could not save')}</p>
        ) : null}
        {tip ? (
          <div className="card">
            <TipForm
              initial={tip}
              onSubmit={(input) => mutation.mutate({ ...input, id: tip.id })}
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
