import { fontWeight, spacing } from '@product/brand';
import { StyleSheet } from 'react-native';
import type { Theme } from '@/theme';

/** Spacing for a column of inset fields under a front-door title. */
export const createFieldStackStyles = (theme: Theme) =>
  StyleSheet.create({
    firstField: {
      marginTop: spacing.lg,
    },
    field: {
      marginTop: spacing.md,
    },
    errorLink: {
      color: theme.colors.text,
      fontWeight: fontWeight.semibold,
    },
  });
