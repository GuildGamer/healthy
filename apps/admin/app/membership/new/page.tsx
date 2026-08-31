'use client';

import type { UpsertMembershipPlanInput } from '@product/contract';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MembershipPlanForm } from '@/components/membership-plan-form';
import { Shell } from '@/components/shell';
import { adminApi } from '@/lib/api';

export default function NewMembershipPlanPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: (input: UpsertMembershipPlanInput) =>
      adminApi.createMembershipPlan(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['admin', 'membership-plans'],
      });
      router.push('/membership');
    },
  });

  return (
    <Shell>
      <div className="page stack">
        <h1 style={{ fontFamily: 'Fraunces, Georgia, serif' }}>New plan</h1>
        {create.error ? (
          <p className="muted">Could not save. Check slug and prices.</p>
        ) : null}
        <MembershipPlanForm
          onSubmit={(input) => create.mutate(input)}
          pending={create.isPending}
        />
      </div>
    </Shell>
  );
}
