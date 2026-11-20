import { fontWeight, spacing } from '@product/brand';
import { StyleSheet, Text, View } from 'react-native';
import { ProfileAvatar } from '@/components/profile';
import { type Theme, useThemedStyles } from '@/theme';
import { minutesAgoLabel } from './today-labels';
import type { GroupPresence } from './types/today-deck';

const FACE_SIZE = 26;

/** One quiet line about someone in a live group, from what its board already shows. */
export function PresenceLine({ presence, now }: { presence: GroupPresence; now: Date }) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.row} testID="home-presence">
      <ProfileAvatar imageUri={presence.image} name={presence.displayName} size={FACE_SIZE} />
      <Text numberOfLines={1} style={styles.text}>
        <Text style={styles.name}>{presence.displayName}</Text> {presence.activity} ·{' '}
        {minutesAgoLabel(presence.movedAt, now)}
      </Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: spacing.xs,
    },
    text: {
      flex: 1,
      color: theme.colors.muted,
      fontSize: 13,
    },
    name: {
      color: theme.colors.text,
      fontWeight: fontWeight.medium,
    },
  });
