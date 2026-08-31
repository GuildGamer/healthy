'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatPercent } from '@/components/analytics/format';
import { RangeSelect } from '@/components/analytics/range-select';
import { Shell } from '@/components/shell';
import { adminApi } from '@/lib/api';
import { errorMessage } from '@/lib/errors';

export default function CatalogAnalyticsPage() {
  const [days, setDays] = useState(28);
  const query = useQuery({
    queryKey: ['admin', 'analytics', 'catalog', days],
    queryFn: () => adminApi.getCatalogAnalytics({ days }),
  });
  const rows = query.data?.challenges ?? [];

  return (
    <Shell>
      <div className="page stack" style={{ maxWidth: 1200 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontFamily: 'Fraunces, Georgia, serif', margin: 0 }}>
              Catalog insights
            </h1>
            <p className="muted" style={{ margin: '8px 0 0' }}>
              Enrollment and completion by challenge. Edit catalog content under
              Catalog.
            </p>
          </div>
          <RangeSelect days={days} onChange={setDays} />
        </div>

        {query.error ? (
          <p className="error">{errorMessage(query.error, 'Could not load catalog insights')}</p>
        ) : null}

        <div className="card" style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Challenge</th>
                <th>Category</th>
                <th>Default</th>
                <th>Active enrollments</th>
                <th>Completions</th>
                <th>Occurrences</th>
                <th>Rate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.challengeId}>
                  <td>
                    {row.title}
                    {!row.isActive ? (
                      <span className="muted"> (inactive)</span>
                    ) : null}
                  </td>
                  <td>{row.category}</td>
                  <td>{row.isDefault ? 'Yes' : 'No'}</td>
                  <td>{row.activeEnrollments}</td>
                  <td>{row.completionsInRange}</td>
                  <td>{row.occurrencesInRange}</td>
                  <td>{formatPercent(row.completionRateInRange)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && !query.isPending ? (
            <p className="muted">No challenges in the catalog yet.</p>
          ) : null}
        </div>
      </div>
    </Shell>
  );
}
