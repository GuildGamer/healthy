'use client';

const OPTIONS = [
  { days: 7, label: '7 days' },
  { days: 28, label: '28 days' },
  { days: 90, label: '90 days' },
] as const;

export function RangeSelect({
  days,
  onChange,
}: {
  days: number;
  onChange: (days: number) => void;
}) {
  return (
    <label style={{ minWidth: 140 }}>
      Range
      <select
        onChange={(event) => onChange(Number(event.target.value))}
        value={days}
      >
        {OPTIONS.map((option) => (
          <option key={option.days} value={option.days}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
