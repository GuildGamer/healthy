'use client';

export function formatPercent(value: number): string {
  return `${Math.round(value * 1000) / 10}%`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString('en-GB');
}

export function countryLabel(code: string | null): string {
  if (!code) {
    return 'Unknown';
  }

  try {
    return (
      new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code
    );
  } catch {
    return code;
  }
}
