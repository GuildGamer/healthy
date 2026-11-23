import { radii } from '@product/brand';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { type Theme, useThemedStyles } from '@/theme';
import { POSE_COPY } from './constants/doing-copy';
import { ProofPlayBadge } from './ProofPlayBadge';

type ProofVideoPlayerProps = {
  uri: string;
  posterUri?: string | null;
  testID?: string;
  /** Share surfaces use contain so the full clip is visible. */
  contentFit?: 'cover' | 'contain';
  /** Fill the parent instead of locking a 9:16 box. */
  fillParent?: boolean;
};

/**
 * A paused video shows nothing until it loads, which reads as empty.
 * Until it is tapped, show the poster with a play mark instead.
 */
export function ProofVideoPlayer({
  uri,
  posterUri = null,
  testID = 'proof-video',
  contentFit = 'cover',
  fillParent = false,
}: ProofVideoPlayerProps) {
  const styles = useThemedStyles(createStyles);
  const [isStarted, setIsStarted] = useState(false);
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = true;
  });
  const frameStyle = [styles.video, fillParent ? styles.videoFill : null];

  if (!isStarted) {
    return (
      <Pressable
        accessibilityLabel={POSE_COPY.proofWatch}
        accessibilityRole="button"
        onPress={() => {
          player.play();
          setIsStarted(true);
        }}
        style={({ pressed }) => [...frameStyle, styles.cover, pressed ? styles.pressed : null]}
        testID={testID}
      >
        {posterUri ? (
          <Image
            resizeMode={contentFit}
            source={{ uri: posterUri }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <ProofPlayBadge />
      </Pressable>
    );
  }

  return (
    <View style={frameStyle} testID={testID}>
      <VideoView
        allowsFullscreen
        contentFit={contentFit}
        nativeControls
        player={player}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    video: {
      width: '100%',
      aspectRatio: 9 / 16,
      borderRadius: radii.md,
      backgroundColor: theme.colors.background,
      overflow: 'hidden',
    },
    videoFill: {
      aspectRatio: undefined,
      flex: 1,
      height: '100%',
    },
    cover: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: {
      opacity: 0.85,
    },
  });
