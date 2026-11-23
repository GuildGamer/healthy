import { fontSize, fontWeight, spacing } from '@product/brand';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeckButton, DeckNavButton, DeckSheetMessage } from '@/components/deck';
import { trackEvent } from '@/lib/analytics';
import { apiClient } from '@/lib/api';
import { goBackOrHome } from '@/lib/go-back';
import { clearPendingShareRoute } from '@/lib/share-card-session';
import type { ShareRoutePoint } from '@/lib/share-route-path';
import type { SharePayload } from '@/components/matches/share-destination';
import {
  SetSharePager,
  ShareDestinationSheet,
  useShareDestinations,
} from '@/components/share';
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
import { useShareClipMedia } from './useShareClipMedia';

/** Share surface: media (and colour on the card), then one Share button → sheet. */
export function ChallengeShareScreen({
  poster,
  friend = null,
  photoUri,
  routePoints,
  runLine = null,
  clipId = null,
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
  /** When present, video ↔ poster pager — same as clip finish. */
  clipId?: string | null;
}) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [fillId, setFillId] = useState<ShareFillId>(() => defaultShareFillId(poster.kind));
  // Hold the route for this screen; the session is cleared on leave so a later
  // history share for another finish never paints this path.
  const [heldRoutePoints] = useState(() => routePoints);
  const clipMedia = useShareClipMedia(clipId);

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
  const resolvedRunLine = runLine ?? posterRunLine(meQuery.data?.currentStreakDays ?? 0);
  const showClipPager = Boolean(clipId);

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.md },
        showClipPager ? styles.screenPager : null,
      ]}
      testID="challenge-share-screen"
    >
      <View style={[styles.nav, showClipPager ? styles.navInset : null]}>
        <DeckNavButton
          accessibilityLabel={SHARE_COPY.close}
          glyph="close"
          onPress={() => goBackOrHome()}
          testID="share-close"
        />
        <Text style={styles.navTitle}>{SHARE_COPY.title}</Text>
        <View style={styles.navSpacer} />
      </View>
      {showClipPager ? (
        <SetSharePager
          actionsInset={spacing.lg}
          caption={posterShareText(poster)}
          clip={clipMedia.clip}
          destinationsDisabled={invite.isCreating}
          fillId={fillId}
          isClipLoading={clipMedia.isLoading}
          messages={
            invite.didFail ? <DeckSheetMessage message={FRIEND_CHALLENGE_COPY.failed} /> : null
          }
          onChallenge={invite.challengeFriend}
          onSelectFill={setFillId}
          onShared={(id) => {
            trackEvent('share_completed', {
              surface: 'challenge_poster',
              completed: true,
              destination: id,
            });
          }}
          photoUri={photoUri}
          poster={poster}
          routePoints={heldRoutePoints}
          runLine={resolvedRunLine}
          showChallenge={invite.isOffered}
          showCopy={false}
        />
      ) : (
        <PosterOnlyShare
          destinationsDisabled={invite.isCreating}
          fillId={fillId}
          inviteFailed={invite.didFail}
          onChallenge={invite.challengeFriend}
          onSelectFill={setFillId}
          photoUri={photoUri}
          poster={poster}
          routePoints={heldRoutePoints}
          runLine={resolvedRunLine}
          showChallenge={invite.isOffered}
        />
      )}
    </View>
  );
}

function PosterOnlyShare({
  poster,
  photoUri,
  routePoints,
  runLine,
  fillId,
  onSelectFill,
  showChallenge,
  destinationsDisabled,
  inviteFailed,
  onChallenge,
}: {
  poster: SharePoster;
  photoUri?: string;
  routePoints?: ShareRoutePoint[];
  runLine: string | null;
  fillId: ShareFillId;
  onSelectFill: (id: ShareFillId) => void;
  showChallenge: boolean;
  destinationsDisabled: boolean;
  inviteFailed: boolean;
  onChallenge: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const [sheetPayload, setSheetPayload] = useState<SharePayload | null>(null);
  const destinations = useShareDestinations({
    buildPayload: () => ({
      caption: posterShareText(poster),
      artifact: { kind: 'image' },
    }),
    onChallenge,
  });

  async function onSharePress() {
    if (destinationsDisabled || destinations.isBusy) {
      return;
    }
    const payload = await destinations.preparePayload();
    if (!payload) {
      return;
    }
    setSheetPayload(payload);
  }

  return (
    <View style={styles.posterOnly}>
      <View style={styles.posterSlot}>
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
            routePoints={routePoints}
            runLine={runLine}
          />
        </View>
      </View>
      {inviteFailed ? <DeckSheetMessage message={FRIEND_CHALLENGE_COPY.failed} /> : null}
      <View style={styles.actions}>
        <ShareFillCarousel onSelect={onSelectFill} selected={fillId} />
        <DeckButton
          disabled={destinationsDisabled || destinations.isBusy}
          label={SHARE_COPY.share}
          onPress={() => void onSharePress()}
          testID="set-share-open"
        />
      </View>
      {sheetPayload ? (
        <ShareDestinationSheet
          onChallenge={onChallenge}
          onClose={() => setSheetPayload(null)}
          onShared={(id) => {
            trackEvent('share_completed', {
              surface: 'challenge_poster',
              completed: true,
              destination: id,
            });
          }}
          payload={sheetPayload}
          showChallenge={showChallenge}
          showCopy={false}
          visible
        />
      ) : null}
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
    screenPager: {
      paddingHorizontal: 0,
    },
    nav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    navInset: {
      paddingHorizontal: 20,
    },
    navTitle: {
      color: theme.colors.text,
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
    },
    navSpacer: {
      width: 40,
    },
    posterOnly: {
      flex: 1,
      minHeight: 0,
    },
    posterSlot: {
      flex: 1,
      minHeight: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    posterWrap: {
      alignSelf: 'center',
    },
    actions: {
      gap: spacing.sm,
      paddingBottom: spacing.sm,
    },
  });
