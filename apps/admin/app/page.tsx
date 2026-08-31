'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarList } from '@/components/analytics/bar-list';
import {
  countryLabel,
  formatNumber,
  formatPercent,
} from '@/components/analytics/format';
import { RangeSelect } from '@/components/analytics/range-select';
import { Sparkline } from '@/components/analytics/sparkline';
import { StatCard } from '@/components/analytics/stat-card';
import { Shell } from '@/components/shell';
import { adminApi } from '@/lib/api';
import { errorMessage } from '@/lib/errors';

export default function OverviewPage() {
  const [days, setDays] = useState(28);
  const meQuery = useQuery({
    queryKey: ['admin', 'me'],
    queryFn: () => adminApi.me(),
  });
  const analyticsQuery = useQuery({
    queryKey: ['admin', 'analytics', 'overview', days],
    queryFn: () => adminApi.getOverviewAnalytics({ days }),
  });

  const data = analyticsQuery.data;

  return (
    <Shell>
      <div className="page stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontFamily: 'Fraunces, Georgia, serif', margin: 0 }}>
              {meQuery.data ? `Hello, ${meQuery.data.name}` : 'Overview'}
            </h1>
            <p className="muted" style={{ margin: '8px 0 0' }}>
              Product pulse for the last {days} days. Revenue arrives in Phase B.
            </p>
          </div>
          <RangeSelect days={days} onChange={setDays} />
        </div>

        {analyticsQuery.error ? (
          <p className="error">{errorMessage(analyticsQuery.error, 'Could not load overview')}</p>
        ) : null}

        <div className="row">
          <StatCard
            hint="Unique members who completed ≥1 challenge in 7d"
            label="WAU completers"
            value={data ? formatNumber(data.wauCompleters) : '—'}
          />
          <StatCard
            label="Active members"
            value={data ? formatNumber(data.membersActive) : '—'}
          />
          <StatCard
            hint={`Last 7 days: ${data ? formatNumber(data.signups7d) : '—'}`}
            label={`Signups (${days}d)`}
            value={data ? formatNumber(data.signupsInRange) : '—'}
          />
          <StatCard
            hint={`${data ? formatNumber(data.completionsInRange) : '—'} completions`}
            label="Completion rate"
            value={data ? formatPercent(data.completionRateInRange) : '—'}
          />
        </div>

        <div className="row">
          <StatCard
            label="Activation rate"
            value={data ? formatPercent(data.activationRate) : '—'}
            hint="Active members with ≥1 health category"
          />
          <StatCard
            label="Country capture"
            value={data ? formatPercent(data.countryCaptureRate) : '—'}
          />
          <StatCard
            label={`Waitlist (${days}d)`}
            value={data ? formatNumber(data.waitlistInRange) : '—'}
          />
        </div>

        <div className="row" style={{ alignItems: 'stretch' }}>
          <div className="card" style={{ flex: 1, minWidth: 260 }}>
            <h2 style={{ marginTop: 0, fontSize: 16 }}>Signups</h2>
            {data ? <Sparkline points={data.sparklineSignups} /> : null}
          </div>
          <div className="card" style={{ flex: 1, minWidth: 260 }}>
            <h2 style={{ marginTop: 0, fontSize: 16 }}>Completions</h2>
            {data ? <Sparkline points={data.sparklineCompletions} /> : null}
          </div>
        </div>

        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>Top countries</h2>
            <Link href="/analytics/markets">Markets →</Link>
          </div>
          <div style={{ marginTop: 16 }}>
            <BarList
              rows={(data?.topCountries ?? []).map((row) => ({
                label: countryLabel(row.countryCode),
                value: row.members,
                share: row.share,
              }))}
            />
          </div>
        </div>

        <div className="row">
          <Link className="btn btn-ghost" href="/analytics/growth">
            Growth
          </Link>
          <Link className="btn btn-ghost" href="/analytics/engagement">
            Engagement
          </Link>
          <Link className="btn btn-ghost" href="/analytics/catalog">
            Catalog insights
          </Link>
          <Link className="btn btn-ghost" href="/analytics/reminders">
            Reminders
          </Link>
        </div>
      </div>
    </Shell>
  );
}
