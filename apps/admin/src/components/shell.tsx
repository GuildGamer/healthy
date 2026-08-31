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

type NavItem =
  | { href: string; label: string; access: 'any' }
  | { href: string; label: string; access: 'content' | 'support' | 'superadmin' };

const NAV: NavItem[] = [
  { href: '/', label: 'Overview', access: 'any' },
  { href: '/analytics/markets', label: 'Markets', access: 'any' },
  { href: '/analytics/growth', label: 'Growth', access: 'any' },
  { href: '/analytics/engagement', label: 'Engagement', access: 'any' },
  { href: '/analytics/catalog', label: 'Catalog insights', access: 'any' },
  { href: '/analytics/reminders', label: 'Reminders', access: 'any' },
  { href: '/catalog', label: 'Catalog', access: 'content' },
  { href: '/membership', label: 'Membership', access: 'content' },
  { href: '/tips', label: 'Tips', access: 'content' },
  { href: '/waitlist', label: 'Waitlist', access: 'content' },
  { href: '/members', label: 'Members', access: 'support' },
  { href: '/admins', label: 'Admins', access: 'superadmin' },
];

function canSee(roles: readonly AdminRoleName[], item: NavItem) {
  if (item.access === 'any') {
    return true;
  }

  if (item.access === 'superadmin') {
    return adminCanManageAdmins(roles);
  }

  return adminHasPermission(roles, item.access);
}

function isActivePath(pathname: string, href: string) {
  if (href === '/') {
    return pathname === '/';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
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
          {NAV.filter((item) => canSee(roles, item)).map((item) => (
            <Link
              href={item.href}
              key={item.href}
              style={{
                color: isActivePath(pathname, item.href)
                  ? 'var(--accent)'
                  : 'var(--text)',
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
