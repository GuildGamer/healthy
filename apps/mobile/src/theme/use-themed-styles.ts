import { useMemo } from 'react';
import { type Theme, useTheme } from './ThemeProvider';

/**
 * Returns the stylesheet a factory builds for the active theme. Declare the
 * factory at module level (returning `StyleSheet.create(...)`) so the sheet is
 * only rebuilt when the scheme changes.
 */
export function useThemedStyles<Styles>(factory: (theme: Theme) => Styles): Styles {
  const theme = useTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}
