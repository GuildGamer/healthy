'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Shell } from '@/components/shell';
import { adminApi } from '@/lib/api';

export default function TipsPage() {
  const query = useQuery({
    queryKey: ['admin', 'tips'],
    queryFn: () => adminApi.listTips(),
  });

  return (
    <Shell>
      <div className="page stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h1 style={{ fontFamily: 'Fraunces, Georgia, serif' }}>Tips</h1>
          <Link className="btn btn-primary" href="/tips/new">
            New tip
          </Link>
        </div>
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {(query.data?.tips ?? []).map((tip) => (
                <tr key={tip.id}>
                  <td>
                    <Link href={`/tips/${tip.id}`}>{tip.title}</Link>
                  </td>
                  <td>{tip.category}</td>
                  <td>{tip.isActive ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
