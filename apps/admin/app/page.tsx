'use client';

import { adminCanManageAdmins, adminHasPermission } from '@product/client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Shell } from '@/components/shell';
import { adminApi } from '@/lib/api';

export default function HomePage() {
  const meQuery = useQuery({
    queryKey: ['admin', 'me'],
    queryFn: () => adminApi.me(),
  });
  const roles = meQuery.data?.roles ?? [];

  return (
    <Shell>
      <div className="page stack">
        <h1 style={{ fontFamily: 'Fraunces, Georgia, serif' }}>
          {meQuery.data ? `Hello, ${meQuery.data.name}` : 'Admin'}
        </h1>
        <p className="muted">
          Roles: {roles.length > 0 ? roles.join(', ') : 'loading…'}
        </p>
        <div className="row">
          {adminHasPermission(roles, 'content') ? (
            <>
              <Link className="btn btn-primary" href="/catalog">
                Catalog
              </Link>
              <Link className="btn btn-ghost" href="/tips">
                Tips
              </Link>
              <Link className="btn btn-ghost" href="/waitlist">
                Waitlist
              </Link>
            </>
          ) : null}
          {adminHasPermission(roles, 'support') ? (
            <Link className="btn btn-ghost" href="/members">
              Members
            </Link>
          ) : null}
          {adminCanManageAdmins(roles) ? (
            <Link className="btn btn-ghost" href="/admins">
              Admins
            </Link>
          ) : null}
        </div>
      </div>
    </Shell>
  );
}
