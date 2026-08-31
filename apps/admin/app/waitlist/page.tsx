'use client';

import { useQuery } from '@tanstack/react-query';
import { Shell } from '@/components/shell';
import { adminApi } from '@/lib/api';

export default function WaitlistPage() {
  const query = useQuery({
    queryKey: ['admin', 'waitlist'],
    queryFn: () => adminApi.listWaitlist(),
  });

  function exportCsv() {
    const rows = query.data?.entries ?? [];
    const csv = [
      'email,source,createdAt',
      ...rows.map(
        (entry) =>
          `${entry.email},${entry.source ?? ''},${entry.createdAt}`,
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'waitlist.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Shell>
      <div className="page stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h1 style={{ fontFamily: 'Fraunces, Georgia, serif' }}>Waitlist</h1>
          <button className="btn btn-ghost" onClick={exportCsv} type="button">
            Export CSV
          </button>
        </div>
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Source</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {(query.data?.entries ?? []).map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.email}</td>
                  <td>{entry.source ?? '—'}</td>
                  <td>{new Date(entry.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
