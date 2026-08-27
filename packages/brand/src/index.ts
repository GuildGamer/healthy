export const colors = {
  background: '#0B1220',
  surface: '#121A2B',
  text: '#F4F7FB',
  muted: '#9AA8BF',
  accent: '#3DDC97',
  danger: '#FF6B6B',
} as const;

export const typography = {
  fontFamilySans: 'Inter, system-ui, sans-serif',
  fontFamilyDisplay: 'Fraunces, Georgia, serif',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
} as const;

export type BrandColors = typeof colors;
