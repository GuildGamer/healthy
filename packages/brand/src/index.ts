export const colors = {
  background: '#0B1220',
  surface: '#121A2B',
  surfaceRaised: '#1A2438',
  border: '#243049',
  text: '#F4F7FB',
  muted: '#9AA8BF',
  accent: '#3DDC97',
  accentPressed: '#31B87E',
  /** Tinted fill behind selected controls — accent at low opacity over background. */
  accentSurface: '#112A2E',
  /** Tonal fill for low-emphasis controls on `surface` — accent at 15%. */
  accentContainer: '#18373B',
  /** Pressed state of `accentContainer` — accent at 26%. */
  accentContainerPressed: '#1D4C47',
  /** Foreground for content sitting on an accent-filled surface. */
  onAccent: '#0B1220',
  danger: '#FF6B6B',
  warning: '#FB923C',
  disabledSurface: '#1B2437',
  disabledText: '#5A6884',
} as const;

export const typography = {
  fontFamilySans: 'Inter, system-ui, sans-serif',
  fontFamilyDisplay: 'Fraunces, Georgia, serif',
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export type BrandColors = typeof colors;
export type BrandRadii = typeof radii;
export type BrandSpacing = typeof spacing;
