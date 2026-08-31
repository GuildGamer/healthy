'use client';

import type { UpsertMembershipPlanInput } from '@product/contract';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MembershipPlanForm } from '@/components/membership-plan-form';
import { Shell } from '@/components/shell';
import { adminApi } from '@/lib/api';

export default function EditMembershipPlanPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['admin', 'membership-plans'],
    queryFn: () => adminApi.listMembershipPlans(),
  });

  const plan = query.data?.items.find((item) => item.id === params.id);

  const update = useMutation({
    mutationFn: (input: UpsertMembershipPlanInput) =>
      adminApi.updateMembershipPlan({ ...input, id: params.id }),
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
        <h1 style={{ fontFamily: 'Fraunces, Georgia, serif' }}>Edit plan</h1>
        {!plan && query.isPending ? <p className="muted">Loading…</p> : null}
        {!plan && !query.isPending ? <p className="muted">Plan not found.</p> : null}
        {plan ? (
          <MembershipPlanForm
            initial={{
              slug: plan.slug,
              name: plan.name,
              tagline: plan.tagline,
              features: plan.features,
              interval: plan.interval,
              isActive: plan.isActive,
              sortOrder: plan.sortOrder,
              headline: plan.headline,
              ctaLabel: plan.ctaLabel,
              paymentMethodIds: plan.paymentMethodIds,
              prices: plan.prices.map((price) => ({
                marketKey: price.marketKey as UpsertMembershipPlanInput['prices'][number]['marketKey'],
                currency: price.currency,
                amountMinor: price.amountMinor,
              })),
            }}
            onSubmit={(input) => update.mutate(input)}
            pending={update.isPending}
          />
        ) : null}
      </div>
    </Shell>
  );
}
