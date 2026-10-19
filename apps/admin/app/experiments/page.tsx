'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Shell } from '@/components/shell';
import { adminApi } from '@/lib/api';
import { errorMessage } from '@/lib/errors';

export default function ExperimentsPage() {
  const query = useQuery({
    queryKey: ['admin', 'experiments'],
    queryFn: () => adminApi.listExperiments(),
  });

  return (
    <Shell>
      <div className="page stack">
        <div>
          <h1 style={{ fontFamily: 'Fraunces, Georgia, serif', margin: 0 }}>
            Experiments
          </h1>
          <p className="muted" style={{ margin: '8px 0 0' }}>
            Assignment counts and primary metrics for running tests.
          </p>
        </div>

        {query.error ? (
          <p className="error">
            {errorMessage(query.error, 'Could not load experiments')}
          </p>
        ) : null}

        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Participants</th>
                <th>Primary metric</th>
              </tr>
            </thead>
            <tbody>
              {(query.data?.experiments ?? []).map((experiment) => (
                <tr key={experiment.id}>
                  <td>
                    <Link href={`/experiments/${experiment.id}`}>
                      {experiment.name}
                    </Link>
                    <div className="muted">{experiment.key}</div>
                  </td>
                  <td>{experiment.status}</td>
                  <td>{experiment.participantCount}</td>
                  <td>{experiment.primaryMetric}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {query.isSuccess && (query.data?.experiments.length ?? 0) === 0 ? (
            <p className="muted" style={{ margin: '12px 0 0' }}>
              No experiments yet.
            </p>
          ) : null}
        </div>
      </div>
    </Shell>
  );
}
