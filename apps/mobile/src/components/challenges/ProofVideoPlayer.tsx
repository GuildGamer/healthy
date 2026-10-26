import { radii } from '@product/brand';
import { useVideoPlayer, VideoView } from 'expo-video';
import { StyleSheet } from 'react-native';

type ProofVideoPlayerProps = {
  uri: string;
  testID?: string;
};

export function ProofVideoPlayer({ uri, testID = 'proof-video' }: ProofVideoPlayerProps) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = true;
  });

  return (
    <VideoView
      allowsFullscreen
      contentFit="contain"
      nativeControls
      player={player}
      style={styles.video}
      testID={testID}
    />
  );
}

const styles = StyleSheet.create({
  video: {
    width: '100%',
    aspectRatio: 9 / 16,
    maxHeight: 420,
    borderRadius: radii.md,
    backgroundColor: '#000',
  },
});
