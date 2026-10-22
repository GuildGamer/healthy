export type ColorScheme = 'dark' | 'light';

export interface BrandColors {
  background: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentPressed: string;
  accentSurface: string;
  accentContainer: string;
  accentContainerPressed: string;
  onAccent: string;
  /** Fill of the one primary action per screen: mint at night, navy ink by day. */
  primary: string;
  primaryPressed: string;
  onPrimary: string;
  danger: string;
  warning: string;
  streak: string;
  streakCore: string;
  disabledSurface: string;
  disabledText: string;
  /** Outline of an unticked check circle. */
  tickIdle: string;
  /** Dims the page behind a sheet. */
  scrim: string;
}

/** One colour per health condition, tuned per scheme for contrast. */
export interface ConditionTones {
  hypertension: string;
  diabetes: string;
  asthma: string;
  general: string;
}

export const darkColors: BrandColors = {
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
  primary: '#3DDC97',
  primaryPressed: '#31B87E',
  onPrimary: '#0B1220',
  danger: '#FF6B6B',
  warning: '#FB923C',
  /**
   * Streak flame, as its own role so celebration never rides on `warning`.
   * Deliberately darker than `warning`: against `accent` the lighter orange
   * lands at a 1.28:1 luminance ratio, too close to resolve, and the edge
   * appears to shimmer. This sits at 2.9:1.
   */
  streak: '#C2410C',
  /** Hot core layered inside `streak` to give the flat glyph depth. */
  streakCore: '#FBBF24',
  disabledSurface: '#1B2437',
  disabledText: '#5A6884',
  tickIdle: '#3A4760',
  scrim: 'rgba(3, 6, 12, 0.62)',
};

export const lightColors: BrandColors = {
  background: '#F5F6F8',
  surface: '#FFFFFF',
  surfaceRaised: '#EEF1F5',
  border: '#E6E9EE',
  text: '#0B1220',
  muted: '#626C7C',
  accent: '#0FA36B',
  accentPressed: '#0C8A5A',
  accentSurface: '#E3F5EC',
  accentContainer: '#D5F0E3',
  accentContainerPressed: '#C2E8D6',
  onAccent: '#FFFFFF',
  primary: '#0B1220',
  primaryPressed: '#1E2A3E',
  onPrimary: '#FFFFFF',
  danger: '#C8362B',
  warning: '#9A5C0C',
  streak: '#C2410C',
  streakCore: '#FBBF24',
  disabledSurface: '#E4E7EC',
  disabledText: '#8D96A4',
  tickIdle: '#C9CFD8',
  scrim: 'rgba(11, 18, 32, 0.32)',
};

export const darkConditionTones: ConditionTones = {
  hypertension: '#E0765C',
  diabetes: '#E8A04E',
  asthma: '#4E8FE0',
  general: '#3DDC97',
};

export const lightConditionTones: ConditionTones = {
  hypertension: '#C4553D',
  diabetes: '#B7741A',
  asthma: '#2F6FC2',
  general: '#0FA36B',
};

export const palettes: Record<ColorScheme, BrandColors> = {
  dark: darkColors,
  light: lightColors,
};

export const conditionTonePalettes: Record<ColorScheme, ConditionTones> = {
  dark: darkConditionTones,
  light: lightConditionTones,
};

/**
 * The bright colour of each kind of card: an open tally segment, a finished
 * chip's tick, and on Clinic white the rail and the numeral.
 */
export interface DeckCardTones {
  bloodPressure: string;
  walk: string;
  water: string;
  strength: string;
  gym: string;
  mobility: string;
}

/** Colours of the Today deck's cards, one fill per kind of challenge. */
export interface DeckCardColors {
  bloodPressure: string;
  walk: string;
  water: string;
  strength: string;
  gym: string;
  mobility: string;
  /** A card about you rather than a challenge, such as this week on You. */
  night: string;
  /** A streak group card, which counts showing up rather than one activity. */
  streak: string;
  /** The bright colour of a streak card: its bar, and on Clinic white its rail. */
  streakTone: string;
  text: string;
  subtext: string;
  track: string;
  /** Clinic white cards are all white, so a rail in the condition tone tells them apart. */
  hasToneRail: boolean;
  tones: DeckCardTones;
  /** Lifts the top card off the page; the cards behind it lie flat. */
  shadow: string;
}

export const darkDeckCards: DeckCardColors = {
  bloodPressure: '#6E2E28',
  walk: '#164A3D',
  water: '#1C3F73',
  strength: '#2E2856',
  gym: '#57213F',
  mobility: '#14454B',
  night: '#1A2540',
  streak: '#4F3416',
  streakTone: '#E8A04E',
  text: '#F4F7FB',
  subtext: 'rgba(244, 247, 251, 0.66)',
  track: 'rgba(244, 247, 251, 0.16)',
  hasToneRail: false,
  shadow: 'rgba(0, 0, 0, 0.45)',
  tones: {
    bloodPressure: '#E0765C',
    walk: '#3DDC97',
    water: '#4E8FE0',
    strength: '#8E80E8',
    gym: '#E06AA8',
    mobility: '#4EC3D0',
  },
};

export const lightDeckCards: DeckCardColors = {
  bloodPressure: '#FFFFFF',
  walk: '#FFFFFF',
  water: '#FFFFFF',
  strength: '#FFFFFF',
  gym: '#FFFFFF',
  mobility: '#FFFFFF',
  night: '#FFFFFF',
  streak: '#FFFFFF',
  streakTone: '#C27A1A',
  text: '#0B1220',
  subtext: '#626C7C',
  track: '#E6E9EE',
  hasToneRail: true,
  shadow: 'rgba(11, 18, 32, 0.08)',
  tones: {
    bloodPressure: '#D9502F',
    walk: '#0FA36B',
    water: '#2F6FE0',
    strength: '#6B4FD8',
    gym: '#C2387F',
    mobility: '#0E8C9B',
  },
};

export const deckCardPalettes: Record<ColorScheme, DeckCardColors> = {
  dark: darkDeckCards,
  light: lightDeckCards,
};

/** Chrome drawn over a live camera, which reads the same in either scheme. */
export interface CameraChromeColors {
  text: string;
  subtext: string;
  /** Round buttons and pills floating on the picture. */
  pill: string;
  /** A quiet button on the picture. */
  glass: string;
  /** The fade under the controls at the foot of the picture. */
  fade: string;
  /** A panel resting on a dimmed picture. */
  panel: string;
  /** Outline that shows where to stand, before you fit it. */
  guide: string;
  /** The main button on the picture. */
  solid: string;
  onSolid: string;
}

export const cameraChrome: CameraChromeColors = {
  text: '#FFFFFF',
  subtext: 'rgba(255, 255, 255, 0.7)',
  pill: 'rgba(0, 0, 0, 0.55)',
  glass: 'rgba(255, 255, 255, 0.16)',
  fade: 'rgba(0, 0, 0, 0.78)',
  panel: 'rgba(11, 18, 32, 0.92)',
  guide: 'rgba(255, 255, 255, 0.55)',
  solid: '#FFFFFF',
  onSolid: '#0B1220',
};

export const cameraChromePalettes: Record<ColorScheme, CameraChromeColors> = {
  dark: cameraChrome,
  light: cameraChrome,
};

/**
 * The dark palette, for screens not yet reading the active theme through
 * `useTheme()` in the mobile app.
 */
export const colors = darkColors;

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
  /** Page titles on the calm screens: one per screen, never the display face. */
  headline: 30,
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
  /** Soft control corners — form fields and primary actions (borderless fill). */
  xl: 20,
  full: 9999,
} as const;

export type BrandRadii = typeof radii;
export type BrandSpacing = typeof spacing;
