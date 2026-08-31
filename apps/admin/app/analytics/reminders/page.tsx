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

export default function RemindersAnalyticsPage() {
  const [days, setDays] = useState(28);
  const query = useQuery({
    queryKey: ['admin', 'analytics', 'reminders', days],
    queryFn: () => adminApi.getRemindersAnalytics({ days }),
  });
  const data = query.data;

  return (
    <Shell>
      <div className="page stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontFamily: 'Fraunces, Georgia, serif', margin: 0 }}>
              Reminders & notifications
            </h1>
            <p className="muted" style={{ margin: '8px 0 0' }}>
              Nudge coverage, push devices, and surprise-evidence outcomes.
            </p>
          </div>
          <RangeSelect days={days} onChange={setDays} />
        </div>

        {query.error ? (
          <p className="error">{errorMessage(query.error, 'Could not load reminders')}</p>
        ) : null}

        <div className="row">
          <StatCard
            hint={`${data ? formatNumber(data.enrollmentsWithReminder) : '—'} of ${data ? formatNumber(data.activeEnrollments) : '—'} enrollments`}
            label="Reminder coverage"
            value={data ? formatPercent(data.reminderCoverage) : '—'}
          />
          <StatCard
            label={`Deliveries (${days}d)`}
            value={data ? formatNumber(data.deliveriesInRange) : '—'}
          />
          <StatCard
            label="Active push devices"
            value={data ? formatNumber(data.pushDevicesActive) : '—'}
          />
          <StatCard
            hint={`${data ? formatNumber(data.notificationsReadInRange) : '—'} read`}
            label="Notification read rate"
            value={data ? formatPercent(data.notificationReadRate) : '—'}
          />
        </div>

        <div className="row" style={{ alignItems: 'stretch' }}>
          <div className="card" style={{ flex: 1 }}>
            <h2 style={{ marginTop: 0, fontSize: 16 }}>Push by platform</h2>
            <BarList
              rows={(data?.pushByPlatform ?? []).map((row) => ({
                label: row.label,
                value: row.count,
              }))}
            />
          </div>
          <div className="card" style={{ flex: 1 }}>
            <h2 style={{ marginTop: 0, fontSize: 16 }}>
              Surprise evidence ({days}d)
            </h2>
            <BarList
              rows={(data?.surpriseEvidenceInRange ?? []).map((row) => ({
                label: row.label,
                value: row.count,
              }))}
            />
          </div>
        </div>
      </div>
    </Shell>
  );
}
