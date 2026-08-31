'use client';

export function BarList({
  rows,
}: {
  rows: Array<{ label: string; value: number; share?: number }>;
}) {
  const max = Math.max(1, ...rows.map((row) => row.value));

  if (rows.length === 0) {
    return <p className="muted">No data yet.</p>;
  }

  return (
    <div className="stack" style={{ gap: 10 }}>
      {rows.map((row) => (
        <div key={row.label}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span>{row.label}</span>
            <span className="muted">
              {row.value.toLocaleString('en-GB')}
              {row.share != null ? ` · ${Math.round(row.share * 100)}%` : ''}
            </span>
          </div>
          <div
            style={{
              marginTop: 6,
              height: 8,
              borderRadius: 999,
              background: 'var(--border)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${(row.value / max) * 100}%`,
                height: '100%',
                background: 'var(--accent)',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
