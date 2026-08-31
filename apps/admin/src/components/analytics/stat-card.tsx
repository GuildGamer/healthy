'use client';

import type { ReactNode } from 'react';

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="card" style={{ minWidth: 160, flex: '1 1 160px' }}>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>
        {label}
      </p>
      <p style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 700 }}>{value}</p>
      {hint ? (
        <p className="muted" style={{ margin: '6px 0 0', fontSize: 12 }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
