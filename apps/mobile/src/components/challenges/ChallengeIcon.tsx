import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { radii } from '@product/brand';
import type { HealthCategory } from '@product/client';
import { StyleSheet, View } from 'react-native';
import {
  categoryIconTint,
  resolveChallengeIcon,
} from './challenge-icon';

const sizes = {
  sm: { box: 28, glyph: 14 },
  md: { box: 40, glyph: 20 },
} as const;

export function ChallengeIcon({
  category,
  completed = true,
  name,
  size = 'sm',
}: {
  category: HealthCategory;
  completed?: boolean;
  name: string;
  size?: keyof typeof sizes;
}) {
  const visual = categoryIconTint[category];
  const iconColor = completed ? visual.iconColor : `${visual.iconColor}B3`;
  const dimensions = sizes[size];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: visual.tint,
          height: dimensions.box,
          opacity: completed ? 1 : 0.7,
          width: dimensions.box,
        },
      ]}
    >
      <MaterialCommunityIcons
        color={iconColor}
        name={resolveChallengeIcon(name)}
        size={dimensions.glyph}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    borderRadius: radii.sm,
    justifyContent: 'center',
  },
});
