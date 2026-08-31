'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarList } from '@/components/analytics/bar-list';
import { formatNumber, formatPercent } from '@/components/analytics/format';
import { RangeSelect } from '@/components/analytics/range-select';
import { StatCard } from '@/components/analytics/stat-card';
import { Shell } from '@/components/shell';
import { adminApi } from '@/lib/api';
import { errorMessage } from '@/lib/errors';

export default function EngagementAnalyticsPage() {
  const [days, setDays] = useState(28);
  const query = useQuery({
    queryKey: ['admin', 'analytics', 'engagement', days],
    queryFn: () => adminApi.getEngagementAnalytics({ days }),
  });
  const data = query.data;

  return (
    <Shell>
      <div className="page stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontFamily: 'Fraunces, Georgia, serif', margin: 0 }}>
              Engagement
            </h1>
            <p className="muted" style={{ margin: '8px 0 0' }}>
              Challenge completions, streaks, and capture mix.
            </p>
          </div>
          <RangeSelect days={days} onChange={setDays} />
        </div>

        {query.error ? (
          <p className="error">{errorMessage(query.error, 'Could not load engagement')}</p>
        ) : null}

        <div className="row">
          <StatCard
            label="WAU completers"
            value={data ? formatNumber(data.wauCompleters) : '—'}
          />
          <StatCard
            label={`Completers (${days}d)`}
            value={data ? formatNumber(data.completersInRange) : '—'}
          />
          <StatCard
            label="Completion rate"
            value={data ? formatPercent(data.completionRateInRange) : '—'}
            hint={`${data ? formatNumber(data.completionsInRange) : '—'} / ${data ? formatNumber(data.occurrencesInRange) : '—'}`}
          />
          <StatCard
            label="Avg active enrollments"
            value={data ? data.averageActiveEnrollments : '—'}
          />
        </div>

        <div className="row" style={{ alignItems: 'stretch' }}>
          <div className="card" style={{ flex: 1 }}>
            <h2 style={{ marginTop: 0, fontSize: 16 }}>Open status mix</h2>
            <BarList
              rows={(data?.statusBreakdown ?? [])
                .filter((row) => row.status !== 'completed')
                .map((row) => ({
                  label: row.status,
                  value: row.count,
                }))}
            />
          </div>
          <div className="card" style={{ flex: 1 }}>
            <h2 style={{ marginTop: 0, fontSize: 16 }}>Streak distribution</h2>
            <BarList
              rows={(data?.streakBuckets ?? []).map((row) => ({
                label: `${row.label} days`,
                value: row.count,
              }))}
            />
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0, fontSize: 16 }}>Completions by category</h2>
          <BarList
            rows={(data?.categoryCompletions ?? []).map((row) => ({
              label: `${row.category} (${formatPercent(row.completionRate)})`,
              value: row.completions,
            }))}
          />
        </div>

        <div className="row" style={{ alignItems: 'stretch' }}>
          <div className="card" style={{ flex: 1 }}>
            <h2 style={{ marginTop: 0, fontSize: 16 }}>Capture kind</h2>
            <BarList
              rows={(data?.captureKindBreakdown ?? []).map((row) => ({
                label: row.captureKind,
                value: row.completions,
              }))}
            />
          </div>
          <div className="card" style={{ flex: 1 }}>
            <h2 style={{ marginTop: 0, fontSize: 16 }}>Frequency</h2>
            <BarList
              rows={(data?.frequencyBreakdown ?? []).map((row) => ({
                label: row.frequency,
                value: row.completions,
              }))}
            />
          </div>
        </div>

        <StatCard
          label="Leaderboard opt-in"
          value={data ? formatPercent(data.leaderboardOptInRate) : '—'}
        />
      </div>
    </Shell>
  );
}
