import { fontSize, fontWeight, spacing } from '@product/brand';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeckNavButton, DeckSheetMessage } from '@/components/deck';
import { trackEvent } from '@/lib/analytics';
import { apiClient } from '@/lib/api';
import { goBackOrHome } from '@/lib/go-back';
import { clearPendingShareRoute } from '@/lib/share-card-session';
import type { ShareRoutePoint } from '@/lib/share-route-path';
import { ShareDestinationRow, useShareDestinations } from '@/components/share';
import { type Theme, useThemedStyles } from '@/theme';
import { FRIEND_CHALLENGE_COPY } from './constants/friend-challenge';
import { friendChallengeSpec } from './friend-challenge';
import { useFriendChallenge } from './useFriendChallenge';
import { SHARE_COPY } from './constants/doing-copy';
import { defaultShareFillId, type ShareFillId } from './share-fill';
import { posterRunLine, posterShareText } from './share-poster';
import { ShareFillCarousel } from './ShareFillCarousel';
import { SharePosterCard } from './SharePosterCard';
import type { ShareFriend } from './types/friend-challenge';
import type { SharePoster } from './types/share-poster';

/** Exactly the image that will be posted, then one-tap destinations to send it. */
export function ChallengeShareScreen({
  poster,
  friend = null,
  photoUri,
  routePoints,
  runLine = null,
}: {
  poster: SharePoster;
  /** Set when history opened this screen. Absent for a share that just finished. */
  friend?: ShareFriend | null;
  /** The gym selfie, only while it is still on the phone from this finish. */
  photoUri?: string;
  /** Walk path for this finish; history shares omit it. */
  routePoints?: ShareRoutePoint[];
  /**
   * Brand footer from progress shares (e.g. "2 days on"). When absent, the
   * member's current streak run line is used.
   */
  runLine?: string | null;
}) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [fillId, setFillId] = useState<ShareFillId>(() => defaultShareFillId(poster.kind));
  // Hold the route for this screen; the session is cleared on leave so a later
  // history share for another finish never paints this path.
  const [heldRoutePoints] = useState(() => routePoints);

  useEffect(
    () => () => {
      clearPendingShareRoute();
    },
    [],
  );
  const meQuery = useQuery({ queryKey: ['me'], queryFn: () => apiClient.me() });
  const invite = useFriendChallenge({
    spec: friendChallengeSpec(friend?.source ?? { kind: 'day' }),
    isEligible: friend?.isEligible ?? false,
    userChallengeId: friend?.userChallengeId,
  });
  const destinations = useShareDestinations({
    buildPayload: () => ({
      caption: posterShareText(poster),
    }),
    onChallenge: invite.challengeFriend,
  });

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
      <View
        collapsable={false}
        ref={destinations.shotRef}
        style={styles.posterWrap}
        testID="share-poster"
      >
        <SharePosterCard
          fillId={fillId}
          photoUri={photoUri}
          poster={poster}
          routePoints={heldRoutePoints}
          runLine={runLine ?? posterRunLine(meQuery.data?.currentStreakDays ?? 0)}
        />
      </View>
      {invite.didFail ? <DeckSheetMessage message={FRIEND_CHALLENGE_COPY.failed} /> : null}
      <View style={styles.actions}>
        <ShareFillCarousel onSelect={setFillId} selected={fillId} />
        <ShareDestinationRow
          disabled={destinations.isBusy || invite.isCreating}
          onSelect={(id) => {
            trackEvent('share_completed', {
              surface: 'challenge_poster',
              completed: true,
              destination: id,
            });
            destinations.select(id);
          }}
          showChallenge={invite.isOffered}
        />
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
