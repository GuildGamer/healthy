'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Shell } from '@/components/shell';
import { adminApi } from '@/lib/api';

export default function CatalogPage() {
  const query = useQuery({
    queryKey: ['admin', 'challenges'],
    queryFn: () => adminApi.listChallenges(),
  });

  return (
    <Shell>
      <div className="page stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h1 style={{ fontFamily: 'Fraunces, Georgia, serif' }}>Catalog</h1>
          <Link className="btn btn-primary" href="/catalog/new">
            New challenge
          </Link>
        </div>
        {query.error ? <p className="error">Could not load the catalog.</p> : null}
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Points</th>
                <th>Default</th>
                <th>Tier</th>
                <th>Active</th>
                <th>Enrolled</th>
              </tr>
            </thead>
            <tbody>
              {(query.data?.challenges ?? []).map((challenge) => (
                <tr key={challenge.id}>
                  <td>
                    <Link href={`/catalog/${challenge.id}`}>{challenge.title}</Link>
                    <div className="muted">{challenge.slug}</div>
                  </td>
                  <td>{challenge.category}</td>
                  <td>{challenge.rewardPoints}</td>
                  <td>{challenge.isDefault ? 'Yes' : 'No'}</td>
                  <td>{challenge.requiresMembership ? 'Paid' : 'Free'}</td>
                  <td>{challenge.isActive ? 'Yes' : 'No'}</td>
                  <td>{challenge.enrollmentCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
