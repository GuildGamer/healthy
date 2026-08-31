'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarList } from '@/components/analytics/bar-list';
import {
  countryLabel,
  formatNumber,
  formatPercent,
} from '@/components/analytics/format';
import { RangeSelect } from '@/components/analytics/range-select';
import { StatCard } from '@/components/analytics/stat-card';
import { Shell } from '@/components/shell';
import { adminApi } from '@/lib/api';
import { errorMessage } from '@/lib/errors';

export default function MarketsAnalyticsPage() {
  const [days, setDays] = useState(28);
  const query = useQuery({
    queryKey: ['admin', 'analytics', 'markets', days],
    queryFn: () => adminApi.getMarketsAnalytics({ days }),
  });
  const data = query.data;

  return (
    <Shell>
      <div className="page stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontFamily: 'Fraunces, Georgia, serif', margin: 0 }}>
              Markets
            </h1>
            <p className="muted" style={{ margin: '8px 0 0' }}>
              Where members are. Paying geography arrives with billing.
            </p>
          </div>
          <RangeSelect days={days} onChange={setDays} />
        </div>

        {query.error ? (
          <p className="error">{errorMessage(query.error, 'Could not load markets')}</p>
        ) : null}

        <div className="row">
          <StatCard
            label="Active members"
            value={data ? formatNumber(data.membersActive) : '—'}
          />
          <StatCard
            label="Unknown country"
            value={data ? formatNumber(data.unknownCountry) : '—'}
          />
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0, fontSize: 16 }}>Members by country</h2>
          <BarList
            rows={(data?.countries ?? []).map((row) => ({
              label: countryLabel(row.countryCode),
              value: row.members,
              share: row.share,
            }))}
          />
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0, fontSize: 16 }}>
            Signups by country ({days}d)
          </h2>
          <BarList
            rows={(data?.signupsByCountryInRange ?? []).map((row) => ({
              label: countryLabel(row.countryCode),
              value: row.members,
              share: row.share,
            }))}
          />
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0, fontSize: 16 }}>Health category mix</h2>
          <BarList
            rows={(data?.categoryMix ?? []).map((row) => ({
              label: row.category,
              value: row.members,
              share: row.share,
            }))}
          />
          <p className="muted" style={{ marginTop: 12, fontSize: 12 }}>
            Members can select multiple categories; counts are selections, not
            unique people.
          </p>
        </div>
      </div>
    </Shell>
  );
}
