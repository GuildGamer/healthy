import { Text, type StyleProp, type TextStyle } from 'react-native';
import { splitShareTextRuns } from './share-poster-text';

type SharePosterTextProps = {
  children: string;
  style?: StyleProp<TextStyle>;
  /** Applied only to non-emoji runs (photo overlays keep their shadow). */
  plainStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
  adjustsFontSizeToFit?: boolean;
  testID?: string;
};

/**
 * Renders share-card copy with emoji in a system face and no shadow, so iOS
 * paints them. Plain runs keep the caller's type and optional overlay shadow.
 */
export function SharePosterText({
  children,
  style,
  plainStyle,
  numberOfLines,
  adjustsFontSizeToFit,
  testID,
}: SharePosterTextProps) {
  const runs = splitShareTextRuns(children);

  if (runs.length === 0) {
    return null;
  }

  const onlyRun = runs[0];
  if (runs.length === 1 && onlyRun && !onlyRun.isEmoji) {
    return (
      <Text
        adjustsFontSizeToFit={adjustsFontSizeToFit}
        numberOfLines={numberOfLines}
        style={[style, plainStyle]}
        testID={testID}
      >
        {children}
      </Text>
    );
  }

  return (
    <Text
      adjustsFontSizeToFit={adjustsFontSizeToFit}
      numberOfLines={numberOfLines}
      style={style}
      testID={testID}
    >
      {runs.map((run, index) =>
        run.isEmoji ? (
          <Text key={`e-${index}`} style={emojiStyle}>
            {run.text}
          </Text>
        ) : (
          <Text key={`p-${index}`} style={plainStyle}>
            {run.text}
          </Text>
        ),
      )}
    </Text>
  );
}

/** System face, no shadow — both required for Apple Color Emoji to paint. */
const emojiStyle: TextStyle = {
  fontFamily: undefined,
  fontWeight: undefined,
  textShadowColor: 'transparent',
  textShadowRadius: 0,
  textShadowOffset: { width: 0, height: 0 },
};
