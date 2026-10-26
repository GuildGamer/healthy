import { radii } from '@product/brand';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { POSE_COPY } from './constants/doing-copy';
import { ProofPlayBadge } from './ProofPlayBadge';

type ProofVideoPlayerProps = {
  uri: string;
  posterUri?: string | null;
  testID?: string;
};

/**
 * A paused video shows nothing until it loads, which reads as a dead black
 * box. Until it is tapped, show the poster with a play mark instead.
 */
export function ProofVideoPlayer({ uri, posterUri = null, testID = 'proof-video' }: ProofVideoPlayerProps) {
  const [isStarted, setIsStarted] = useState(false);
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = true;
  });

  if (!isStarted) {
    return (
      <Pressable
        accessibilityLabel={POSE_COPY.proofWatch}
        accessibilityRole="button"
        onPress={() => {
          player.play();
          setIsStarted(true);
        }}
        style={({ pressed }) => [styles.video, styles.cover, pressed ? styles.pressed : null]}
        testID={testID}
      >
        {posterUri ? <Image source={{ uri: posterUri }} style={StyleSheet.absoluteFill} /> : null}
        <ProofPlayBadge />
      </Pressable>
    );
  }

  return (
    <View style={styles.video} testID={testID}>
      <VideoView
        allowsFullscreen
        contentFit="contain"
        nativeControls
        player={player}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  video: {
    width: '100%',
    aspectRatio: 9 / 16,
    maxHeight: 420,
    borderRadius: radii.md,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  cover: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
