'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarList } from '@/components/analytics/bar-list';
import { formatNumber, formatPercent } from '@/components/analytics/format';
import { RangeSelect } from '@/components/analytics/range-select';
import { Sparkline } from '@/components/analytics/sparkline';
import { StatCard } from '@/components/analytics/stat-card';
import { Shell } from '@/components/shell';
import { adminApi } from '@/lib/api';
import { errorMessage } from '@/lib/errors';

export default function GrowthAnalyticsPage() {
  const [days, setDays] = useState(28);
  const query = useQuery({
    queryKey: ['admin', 'analytics', 'growth', days],
    queryFn: () => adminApi.getGrowthAnalytics({ days }),
  });
  const data = query.data;

  return (
    <Shell>
      <div className="page stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontFamily: 'Fraunces, Georgia, serif', margin: 0 }}>
              Growth
            </h1>
            <p className="muted" style={{ margin: '8px 0 0' }}>
              Waitlist → signup → activation.
            </p>
          </div>
          <RangeSelect days={days} onChange={setDays} />
        </div>

        {query.error ? (
          <p className="error">{errorMessage(query.error, 'Could not load growth')}</p>
        ) : null}

        <div className="row">
          <StatCard
            label="Waitlist total"
            value={data ? formatNumber(data.waitlistTotal) : '—'}
          />
          <StatCard
            label={`Waitlist (${days}d)`}
            value={data ? formatNumber(data.waitlistInRange) : '—'}
          />
          <StatCard
            hint={`Verified: ${data ? formatNumber(data.verifiedInRange) : '—'}`}
            label={`Signups (${days}d)`}
            value={data ? formatNumber(data.signupsInRange) : '—'}
          />
          <StatCard
            hint={`First completers in range: ${data ? formatNumber(data.activatedInRange) : '—'}`}
            label="Activation rate"
            value={data ? formatPercent(data.activationRate) : '—'}
          />
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0, fontSize: 16 }}>Signups by day</h2>
          {data ? <Sparkline points={data.signupsByDay} /> : null}
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0, fontSize: 16 }}>Waitlist by source</h2>
          <BarList
            rows={(data?.waitlistBySource ?? []).map((row) => ({
              label: row.label,
              value: row.count,
            }))}
          />
        </div>

        <StatCard
          hint="Share of active members with a country saved"
          label="Country capture"
          value={data ? formatPercent(data.countryCaptureRate) : '—'}
        />
      </div>
    </Shell>
  );
}
