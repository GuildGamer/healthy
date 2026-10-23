import { fontSize, fontWeight, spacing } from '@product/brand';
import { useQuery } from '@tanstack/react-query';
import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import { DeckButton, DeckNavButton, DeckSheetMessage } from '@/components/deck';
import { apiClient } from '@/lib/api';
import { goBackOrHome } from '@/lib/go-back';
import { type Theme, useThemedStyles } from '@/theme';
import { FRIEND_CHALLENGE_COPY } from './constants/friend-challenge';
import { friendChallengeSpec } from './friend-challenge';
import { useFriendChallenge } from './useFriendChallenge';
import { SHARE_COPY } from './constants/doing-copy';
import { posterRunLine, posterShareText } from './share-poster';
import { SharePosterCard } from './SharePosterCard';
import type { ShareFriend } from './types/friend-challenge';
import type { SharePoster } from './types/share-poster';

/** Exactly the image that will be posted, then the phone's own places to post it. */
export function ChallengeShareScreen({
  poster,
  friend = null,
  photoUri,
}: {
  poster: SharePoster;
  /** Set when history opened this screen. Absent for a share that just finished. */
  friend?: ShareFriend | null;
  /** The gym selfie, only while it is still on the phone from this finish. */
  photoUri?: string;
}) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const posterRef = useRef<View>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const meQuery = useQuery({ queryKey: ['me'], queryFn: () => apiClient.me() });
  const invite = useFriendChallenge({
    spec: friendChallengeSpec(friend?.source ?? { kind: 'day' }),
    isEligible: friend?.isEligible ?? false,
    userChallengeId: friend?.userChallengeId,
  });

  async function shareImage(): Promise<boolean> {
    if (!posterRef.current || !(await Sharing.isAvailableAsync())) {
      return false;
    }

    const uri = await captureRef(posterRef, { format: 'png', quality: 1 });
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: SHARE_COPY.title });
    return true;
  }

  async function share() {
    setIsSharing(true);
    setError(null);
    try {
      const sharedImage = await shareImage().catch(() => false);
      if (!sharedImage) {
        await Share.share({ message: posterShareText(poster) });
      }
    } catch {
      setError(SHARE_COPY.failed);
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.md },
      ]}
      testID="challenge-share-screen"
    >
      <View style={styles.nav}>
        <DeckNavButton
          accessibilityLabel={SHARE_COPY.close}
          glyph="close"
          onPress={() => goBackOrHome()}
          testID="share-close"
        />
        <Text style={styles.navTitle}>{SHARE_COPY.title}</Text>
        <View style={styles.navSpacer} />
      </View>
      <View collapsable={false} ref={posterRef} style={styles.posterWrap}>
        <SharePosterCard
          photoUri={photoUri}
          poster={poster}
          runLine={posterRunLine(meQuery.data?.currentStreakDays ?? 0)}
        />
      </View>
      {error ? <DeckSheetMessage message={error} /> : null}
      {invite.didFail ? <DeckSheetMessage message={FRIEND_CHALLENGE_COPY.failed} /> : null}
      <View style={styles.actions}>
        <DeckButton
          glyph="share"
          label={SHARE_COPY.share}
          loading={isSharing}
          onPress={() => void share()}
          testID="share-poster"
        />
        {invite.isOffered ? (
          <DeckButton
            label={FRIEND_CHALLENGE_COPY.action}
            loading={invite.isCreating}
            onPress={invite.challengeFriend}
            testID="share-challenge-friend"
            variant="quiet"
          />
        ) : null}
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
      paddingHorizontal: 20,
    },
    nav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    navTitle: {
      color: theme.colors.text,
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
    },
    navSpacer: {
      width: 40,
    },
    posterWrap: {
      alignSelf: 'center',
      marginTop: 18,
    },
    actions: {
      marginTop: 'auto',
      gap: spacing.sm,
    },
  });
