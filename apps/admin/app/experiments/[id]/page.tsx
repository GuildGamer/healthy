'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BarList } from '@/components/analytics/bar-list';
import { formatNumber, formatPercent } from '@/components/analytics/format';
import { StatCard } from '@/components/analytics/stat-card';
import { Shell } from '@/components/shell';
import { adminApi } from '@/lib/api';
import { errorMessage } from '@/lib/errors';

const STAGE_2_WEIGHTS = [
  { variantKey: 'control', weight: 1 },
  { variantKey: 'treatment', weight: 1 },
] as const;

const STAGE_1_WEIGHTS = [
  { variantKey: 'control', weight: 0 },
  { variantKey: 'treatment', weight: 1 },
] as const;

export default function ExperimentDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['admin', 'experiments', params.id],
    queryFn: () => adminApi.getExperiment({ id: params.id }),
    enabled: Boolean(params.id),
  });
  const experiment = query.data;

  const updateWeights = useMutation({
    mutationFn: (variants: { variantKey: string; weight: number }[]) =>
      adminApi.updateExperimentWeights({ id: params.id, variants }),
    onSuccess: (detail) => {
      queryClient.setQueryData(['admin', 'experiments', params.id], detail);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'experiments'] });
    },
  });

  const canStageFlip =
    experiment?.key === 'challenge_referral_v1' &&
    experiment.variants.some((variant) => variant.variantKey === 'control') &&
    experiment.variants.some((variant) => variant.variantKey === 'treatment');

  return (
    <Shell>
      <div className="page stack">
        <div>
          <p className="muted" style={{ margin: '0 0 8px' }}>
            <Link href="/experiments">Experiments</Link>
          </p>
          <h1 style={{ fontFamily: 'Fraunces, Georgia, serif', margin: 0 }}>
            {experiment?.name ?? 'Experiment'}
          </h1>
          {experiment ? (
            <p className="muted" style={{ margin: '8px 0 0' }}>
              {experiment.key} · {experiment.status} · {experiment.primaryMetric}
            </p>
          ) : null}
        </div>

        {query.error ? (
          <p className="error">
            {errorMessage(query.error, 'Could not load experiment')}
          </p>
        ) : null}

        {experiment?.stageHint ? (
          <p
            className="card"
            style={{ margin: 0, maxWidth: 48 * 16, fontSize: 14, lineHeight: 1.45 }}
          >
            {experiment.stageHint}
          </p>
        ) : null}

        {experiment?.description ? (
          <p style={{ margin: 0, maxWidth: 48 * 16 }}>{experiment.description}</p>
        ) : null}

        <div className="row">
          <StatCard
            label="Participants"
            value={experiment ? formatNumber(experiment.participantCount) : '—'}
          />
          <StatCard
            label="Variants"
            value={experiment ? formatNumber(experiment.variants.length) : '—'}
          />
          <StatCard
            hint={
              experiment?.startAt
                ? `Started ${new Date(experiment.startAt).toLocaleDateString('en-GB')}`
                : undefined
            }
            label="Primary metric"
            value={experiment?.primaryMetric ?? '—'}
          />
        </div>

        {canStageFlip ? (
          <div className="card stack" style={{ maxWidth: 48 * 16 }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>Assignment weights</h2>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              Stage 1 keeps 100% treatment. Stage 2 sets equal 50/50 weights for
              new assignments only. Sticky users stay put. Does not auto-flip
              production; you choose when.
            </p>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <button
                disabled={updateWeights.isPending}
                onClick={() => updateWeights.mutate([...STAGE_1_WEIGHTS])}
                type="button"
              >
                Stage 1 (100% treatment)
              </button>
              <button
                disabled={updateWeights.isPending}
                onClick={() => updateWeights.mutate([...STAGE_2_WEIGHTS])}
                type="button"
              >
                Stage 2 (50/50)
              </button>
            </div>
            {updateWeights.error ? (
              <p className="error">
                {errorMessage(updateWeights.error, 'Could not update weights')}
              </p>
            ) : null}
            {updateWeights.isSuccess ? (
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                Weights updated.
              </p>
            ) : null}
          </div>
        ) : null}

        {(experiment?.variants ?? []).map((variant) => (
          <div className="card stack" key={variant.variantKey}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16 }}>{variant.variantName}</h2>
              <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                {variant.variantKey} · weight {formatNumber(variant.weight)} ·{' '}
                {formatNumber(variant.assignedCount)} assigned
                {variant.challengeSendRate != null
                  ? ` · H1 send ${formatPercent(variant.challengeSendRate)}`
                  : ''}
                {variant.inviteAcceptRate != null
                  ? ` · H2 join ${formatPercent(variant.inviteAcceptRate)}`
                  : ''}
                {variant.activatedFriendRate != null
                  ? ` · H3 activated ${formatPercent(variant.activatedFriendRate)}`
                  : ''}
                {variant.secondGenerationRate != null
                  ? ` · 2nd gen ${formatPercent(variant.secondGenerationRate)}`
                  : ''}
              </p>
            </div>
            <div>
              <h3 style={{ margin: '0 0 10px', fontSize: 14 }}>Funnel</h3>
              <BarList
                rows={variant.funnel.map((step) => ({
                  label: step.label,
                  value: step.count,
                }))}
              />
            </div>
          </div>
        ))}

        {query.isPending ? <p className="muted">Loading…</p> : null}
      </div>
    </Shell>
  );
}
