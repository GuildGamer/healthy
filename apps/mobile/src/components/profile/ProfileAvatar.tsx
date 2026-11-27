import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Glyph } from '@/components/icons';
import { tipQuoteFontFamily } from '@/lib/fonts';
import { type Theme, useTheme, useThemedStyles } from '@/theme';

const DEFAULT_SIZE = 88;
const BADGE_SIZE = 30;
const BADGE_RING_WIDTH = 3;

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
  onPreviewPress,
  size = DEFAULT_SIZE,
  testID,
}: {
  imageUri?: string | null;
  name: string;
  onEditPress?: () => void;
  onPreviewPress?: () => void;
  size?: number;
  testID?: string;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const initials = initialsFor(name);
  const radius = size / 2;
  const canPreview = Boolean(imageUri && onPreviewPress);

  const face = (
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
        <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{initials}</Text>
      ) : (
        <Glyph color={colors.accent} name="you" size={size * 0.5} />
      )}
    </View>
  );

  return (
    <View style={{ width: size, height: size }}>
      {canPreview ? (
        <Pressable
          accessibilityLabel="Preview profile photo"
          accessibilityRole="button"
          onPress={onPreviewPress}
          testID={testID ? `${testID}-preview` : 'profile-avatar-preview'}
        >
          {face}
        </Pressable>
      ) : (
        face
      )}
      {onEditPress ? (
        <Pressable
          accessibilityLabel="Edit profile photo"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onEditPress}
          style={styles.badge}
          testID="profile-avatar-edit"
        >
          <Glyph color={colors.text} name="camera" size={14} strokeWidth={2.2} />
        </Pressable>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    face: {
      backgroundColor: theme.colors.accentSurface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    initials: {
      color: theme.colors.accent,
      fontFamily: tipQuoteFontFamily,
    },
    badge: {
      position: 'absolute',
      right: -2,
      bottom: -2,
      width: BADGE_SIZE,
      height: BADGE_SIZE,
      borderRadius: BADGE_SIZE / 2,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: BADGE_RING_WIDTH,
      borderColor: theme.colors.background,
    },
  });
