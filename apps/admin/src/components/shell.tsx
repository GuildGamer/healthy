'use client';

import {
  adminCanManageAdmins,
  adminHasPermission,
  type AdminRoleName,
} from '@product/client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { signOut, useSession } from '@/lib/auth-client';

const NAV = [
  { href: '/catalog', label: 'Catalog', role: 'content' as const },
  { href: '/tips', label: 'Tips', role: 'content' as const },
  { href: '/waitlist', label: 'Waitlist', role: 'content' as const },
  { href: '/members', label: 'Members', role: 'support' as const },
  { href: '/admins', label: 'Admins', role: 'superadmin' as const },
];

function canSee(roles: readonly AdminRoleName[], role: (typeof NAV)[number]['role']) {
  if (role === 'superadmin') {
    return adminCanManageAdmins(roles);
  }

  return adminHasPermission(roles, role);
}

export function Shell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const session = useSession();
  const meQuery = useQuery({
    queryKey: ['admin', 'me'],
    queryFn: () => adminApi.me(),
    enabled: session.data != null,
  });

  useEffect(() => {
    if (session.isPending) {
      return;
    }

    if (!session.data) {
      router.replace('/login');
    }
  }, [router, session.data, session.isPending]);

  if (session.isPending || !session.data) {
    return <p className="muted">Checking session…</p>;
  }

  const roles = meQuery.data?.roles ?? [];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: '100vh' }}>
      <aside
        style={{
          borderRight: '1px solid var(--border)',
          padding: 24,
          background: 'var(--surface)',
        }}
      >
        <p style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 22, margin: '0 0 24px' }}>
          Healthy
        </p>
        <nav className="stack">
          {NAV.filter((item) => canSee(roles, item.role)).map((item) => (
            <Link
              href={item.href}
              key={item.href}
              style={{
                color: pathname.startsWith(item.href) ? 'var(--accent)' : 'var(--text)',
                fontWeight: 600,
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div style={{ marginTop: 32 }}>
          <p className="muted" style={{ fontSize: 13 }}>
            {session.data.user.email}
          </p>
          <button
            className="btn btn-ghost"
            onClick={() => {
              void signOut().then(() => router.replace('/login'));
            }}
            type="button"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main style={{ padding: 32 }}>{children}</main>
    </div>
  );
}
