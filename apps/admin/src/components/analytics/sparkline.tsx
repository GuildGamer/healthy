'use client';

export function Sparkline({
  points,
}: {
  points: Array<{ day: string; count: number }>;
}) {
  const max = Math.max(1, ...points.map((point) => point.count));
  const height = 48;
  const width = Math.max(120, points.length * 6);
  const step = points.length <= 1 ? width : width / (points.length - 1);
  const path = points
    .map((point, index) => {
      const x = index * step;
      const y = height - (point.count / max) * (height - 4) - 2;
      return `${index === 0 ? 'M' : 'L'}${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      aria-hidden
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
    >
      <path
        d={path}
        fill="none"
        stroke="var(--accent)"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}
