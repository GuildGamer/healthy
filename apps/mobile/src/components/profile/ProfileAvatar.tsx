import Feather from '@expo/vector-icons/Feather';
import { colors } from '@product/brand';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { tipQuoteFontFamily } from '@/lib/fonts';

const DEFAULT_SIZE = 88;
const BADGE_SIZE = 28;

export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '';
  }

  const first = parts[0]?.[0] ?? '';
  if (parts.length === 1) {
    return first.toUpperCase();
  }

  const last = parts[parts.length - 1]?.[0] ?? '';
  return `${first}${last}`.toUpperCase();
}

/** Same face on Profile and Edit Profile — username first, legal name next. */
export function avatarNameFor(input: {
  displayName?: string | null;
  name?: string | null;
}): string {
  const displayName = input.displayName?.trim() ?? '';
  if (displayName.length > 0) {
    return displayName;
  }

  return input.name?.trim() ?? '';
}

export function ProfileAvatar({
  imageUri,
  name,
  onEditPress,
  size = DEFAULT_SIZE,
  testID,
}: {
  imageUri?: string | null;
  name: string;
  onEditPress?: () => void;
  size?: number;
  testID?: string;
}) {
  const initials = initialsFor(name);
  const radius = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          styles.face,
          {
            width: size,
            height: size,
            borderRadius: radius,
          },
        ]}
        testID={testID}
      >
        {imageUri ? (
          <Image
            accessibilityIgnoresInvertColors
            source={{ uri: imageUri }}
            style={{ width: size, height: size, borderRadius: radius }}
          />
        ) : initials ? (
          <Text style={[styles.initials, { fontSize: size * 0.36 }]}>
            {initials}
          </Text>
        ) : (
          <Feather color={colors.accent} name="user" size={size * 0.42} />
        )}
      </View>
      {onEditPress ? (
        <Pressable
          accessibilityLabel="Edit profile photo"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onEditPress}
          style={styles.badge}
          testID="profile-avatar-edit"
        >
          <Feather color={colors.onAccent} name="edit-2" size={13} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  face: {
    backgroundColor: colors.accentSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    color: colors.accent,
    fontFamily: tipQuoteFontFamily,
  },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
});
