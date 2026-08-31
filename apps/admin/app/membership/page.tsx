'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { formatMembershipAmount } from '@product/contract';
import { Shell } from '@/components/shell';
import { adminApi } from '@/lib/api';

export default function MembershipPlansPage() {
  const query = useQuery({
    queryKey: ['admin', 'membership-plans'],
    queryFn: () => adminApi.listMembershipPlans(),
  });

  return (
    <Shell>
      <div className="page stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h1 style={{ fontFamily: 'Fraunces, Georgia, serif' }}>Membership</h1>
          <Link className="btn btn-primary" href="/membership/new">
            New plan
          </Link>
        </div>
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>NG</th>
                <th>USD</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {(query.data?.items ?? []).map((plan) => {
                const ng = plan.prices.find((price) => price.marketKey === 'NG');
                const usd = plan.prices.find((price) => price.marketKey === '*');
                return (
                  <tr key={plan.id}>
                    <td>
                      <Link href={`/membership/${plan.id}`}>{plan.name}</Link>
                    </td>
                    <td>
                      {ng
                        ? formatMembershipAmount(ng.currency, ng.amountMinor)
                        : '—'}
                    </td>
                    <td>
                      {usd
                        ? formatMembershipAmount(usd.currency, usd.amountMinor)
                        : '—'}
                    </td>
                    <td>{plan.isActive ? 'Yes' : 'No'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
