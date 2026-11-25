import { spacing } from '@product/brand';
import { useRef, useState, type ReactNode, type RefObject } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { DeckButton } from '@/components/deck';
import type { ShareDestinationId, SharePayload } from '@/components/matches/share-destination';
import type { ShareRoutePoint } from '@/lib/share-route-path';
import { type Theme, useThemedStyles } from '@/theme';
import { GymPhotoShareCard } from '@/components/challenges/GymPhotoShareCard';
import { ShareFillCarousel } from '@/components/challenges/ShareFillCarousel';
import {
  SHARE_POSTER_HEIGHT,
  SHARE_POSTER_WIDTH,
  SharePosterCard,
} from '@/components/challenges/SharePosterCard';
import type { ShareFillId } from '@/components/challenges/share-fill';
import type { SharePoster } from '@/components/challenges/types/share-poster';
import { SHARE_COPY } from '@/components/challenges/constants/doing-copy';
import { SharePage } from './SharePage';
import { ShareDestinationSheet } from './ShareDestinationSheet';
import { SHARE_SWATCH_BAND_HEIGHT, swatchFadeRange, type SetSharePage } from './set-share-layout';
import type { SetShareClipMedia } from './types/set-share-clip-media';
import { useShareDestinations } from './useShareDestinations';

export type { SetSharePage } from './set-share-layout';
export type { SetShareClipMedia } from './types/set-share-clip-media';

type SetSharePagerProps = {
  clip: SetShareClipMedia | null;
  isClipLoading?: boolean;
  /** Override the default video player (e.g. ProofClipHero on finish). */
  renderVideo?: (clip: SetShareClipMedia) => ReactNode;
  poster: SharePoster;
  /** Gym selfie from this finish: offered as the card's first background. Ignored when a clip exists. */
  photoUri?: string | null;
  routePoints?: ShareRoutePoint[];
  runLine: string | null;
  fillId: ShareFillId;
  onSelectFill: (id: ShareFillId) => void;
  caption: string;
  inviteUrl?: string | null;
  destinationsDisabled?: boolean;
  showChallenge?: boolean;
  showCopy?: boolean;
  onChallenge?: () => void;
  onCopied?: () => void;
  onShared?: (id: ShareDestinationId) => void;
  /** Errors / notes above the Share button. */
  messages?: ReactNode;
  /** Board switch and status lines under Share. */
  footer?: ReactNode;
  /** Horizontal inset for the foot and the colour row. Default matches clip finish. */
  actionsInset?: number;
  pagerTestID?: string;
  listTestID?: string;
  posterTestID?: string;
};

/**
 * Video ↔ card pager for any set share. One Share button opens the destination
 * sheet for the page in front. The card's background is a colour or, for a gym
 * finish, your selfie — the first swatch, chosen by default. A selfie is never
 * a page of its own.
 *
 * Preview cards are laid out at the measured slot size (no transform scale —
 * FlatList cells clip scaled children and blank the poster). Square capture
 * twins sit outside the list at design size for sharp exports.
 *
 * The colour row is always laid out in a reserved band under the cards, so the
 * card never resizes. It sits over the pager and fades in with the swipe,
 * from halfway towards the card, instead of popping in after the swipe settles.
 */
export function SetSharePager({
  clip,
  isClipLoading = false,
  renderVideo,
  poster,
  photoUri,
  routePoints,
  runLine,
  fillId,
  onSelectFill,
  caption,
  inviteUrl = null,
  destinationsDisabled = false,
  showChallenge = false,
  showCopy = false,
  onChallenge,
  onCopied,
  onShared,
  messages,
  footer,
  actionsInset = spacing.lg,
  pagerTestID = 'clip-finish-pager',
  listTestID = 'clip-finish-list',
  posterTestID = 'clip-finish-poster',
}: SetSharePagerProps) {
  const styles = useThemedStyles(createStyles);
  const { width: windowWidth } = useWindowDimensions();
  const photoShotRef = useRef<View>(null);
  const posterShotRef = useRef<View>(null);
  const scrollOffset = useRef(new Animated.Value(0)).current;
  const pages = sharePages({ clip, isClipLoading });
  const offeredPhotoUri = clip || isClipLoading ? null : (photoUri ?? null);
  const [isPhotoChosen, setIsPhotoChosen] = useState(true);
  const backgroundPhotoUri = isPhotoChosen ? offeredPhotoUri : null;
  const [activePage, setActivePage] = useState<SetSharePage>(() => pages[0] ?? 'poster');
  const [slot, setSlot] = useState({ width: 0, height: 0 });
  const [sheetPayload, setSheetPayload] = useState<SharePayload | null>(null);

  const showPosterPage = activePage === 'poster';
  const pageWidth = slot.width > 0 ? slot.width : Math.max(windowWidth - spacing.lg * 2, 1);
  const hasColourRow = !isClipLoading && pages.includes('poster');
  const colourRowOpacity = colourRowOpacityFor(pages.indexOf('poster'), pageWidth, scrollOffset);

  const destinations = useShareDestinations({
    buildPayload: () => {
      if (activePage === 'video' && clip) {
        return {
          caption,
          inviteUrl,
          artifact: {
            kind: 'video' as const,
            clipUri: clip.shareUri,
            socialClipUri: clip.socialShareUri ?? null,
          },
        };
      }
      return {
        caption,
        inviteUrl,
        artifact: { kind: 'image' as const },
      };
    },
    getShotRef: () =>
      (backgroundPhotoUri ? photoShotRef : posterShotRef) as RefObject<View | null>,
    onChallenge,
    onCopied: () => {
      onCopied?.();
    },
  });

  function onSlotLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    if (width <= 0 || height <= 0) {
      return;
    }
    setSlot((current) =>
      current.width === width && current.height === height ? current : { width, height },
    );
  }

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    scrollOffset.setValue(event.nativeEvent.contentOffset.x);
  }

  function onScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (pageWidth <= 0) {
      return;
    }
    const next = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
    const page = pages[next];
    if (page) {
      setActivePage(page);
    }
  }

  function onSelectColour(id: ShareFillId) {
    setIsPhotoChosen(false);
    onSelectFill(id);
  }

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
    <View style={styles.root} testID={pagerTestID}>
      <View onLayout={onSlotLayout} style={styles.mediaSlot}>
        {isClipLoading ? (
          <ActivityIndicator />
        ) : (
          <FlatList
            data={pages}
            extraData={`${pageWidth}:${slot.height}:${activePage}:${fillId}:${backgroundPhotoUri ?? ''}`}
            getItemLayout={(_, index) => ({
              length: pageWidth,
              offset: pageWidth * index,
              index,
            })}
            horizontal
            initialNumToRender={2}
            keyExtractor={(item) => item}
            onMomentumScrollEnd={onScrollEnd}
            onScroll={onScroll}
            pagingEnabled
            renderItem={({ item }) => (
              <SharePage
                backgroundPhotoUri={backgroundPhotoUri}
                clip={clip}
                fillId={fillId}
                page={item}
                pageWidth={pageWidth}
                poster={poster}
                posterTestID={posterTestID}
                renderVideo={renderVideo}
                routePoints={routePoints}
                runLine={runLine}
                slotHeight={slot.height}
              />
            )}
            scrollEventThrottle={16}
            showsHorizontalScrollIndicator={false}
            style={{ width: pageWidth }}
            testID={listTestID}
          />
        )}
        {hasColourRow ? (
          <Animated.View
            accessibilityElementsHidden={!showPosterPage}
            importantForAccessibility={showPosterPage ? 'auto' : 'no-hide-descendants'}
            pointerEvents={showPosterPage ? 'auto' : 'none'}
            style={[
              styles.colourRow,
              { opacity: colourRowOpacity, paddingHorizontal: actionsInset },
            ]}
            testID="share-colour-row"
          >
            <ShareFillCarousel
              isPhotoSelected={backgroundPhotoUri != null}
              onSelect={onSelectColour}
              onSelectPhoto={() => setIsPhotoChosen(true)}
              photoUri={offeredPhotoUri}
              selected={fillId}
            />
          </Animated.View>
        ) : null}
      </View>
      {offeredPhotoUri ? (
        <View
          accessibilityElementsHidden
          collapsable={false}
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          ref={photoShotRef}
          style={[
            styles.captureTwin,
            {
              left: -SHARE_POSTER_WIDTH * 4,
              width: SHARE_POSTER_WIDTH,
              height: SHARE_POSTER_HEIGHT,
            },
          ]}
          testID="gym-photo-share-capture-host"
        >
          <GymPhotoShareCard
            corners="square"
            photoUri={offeredPhotoUri}
            poster={poster}
            runLine={runLine}
            testID="gym-photo-share-card-capture"
          />
        </View>
      ) : null}
      <View
        accessibilityElementsHidden
        collapsable={false}
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        ref={posterShotRef}
        style={[
          styles.captureTwin,
          {
            left: -SHARE_POSTER_WIDTH * 4,
            width: SHARE_POSTER_WIDTH,
            height: SHARE_POSTER_HEIGHT,
          },
        ]}
        testID="share-poster-capture-host"
      >
        <SharePosterCard
          corners="square"
          fillId={fillId}
          poster={poster}
          routePoints={routePoints}
          runLine={runLine}
          testID="share-poster-image-capture"
        />
      </View>
      {pages.length > 1 ? (
        <View style={styles.dots}>
          {pages.map((page) => (
            <View
              key={page}
              style={[styles.dot, page === activePage ? styles.dotOn : null]}
            />
          ))}
        </View>
      ) : null}
      <View style={[styles.actions, { paddingHorizontal: actionsInset }]}>
        {messages}
        <DeckButton
          disabled={destinationsDisabled || destinations.isBusy}
          label={SHARE_COPY.share}
          onPress={() => void onSharePress()}
          testID="set-share-open"
        />
        {footer}
      </View>
      {sheetPayload ? (
        <ShareDestinationSheet
          onChallenge={onChallenge}
          onClose={() => setSheetPayload(null)}
          onShared={(id) => {
            onShared?.(id);
            if (id === 'copy') {
              onCopied?.();
            }
          }}
          payload={sheetPayload}
          showChallenge={showChallenge}
          showCopy={showCopy}
          visible
        />
      ) : null}
    </View>
  );
}

function sharePages(input: {
  clip: SetShareClipMedia | null;
  isClipLoading: boolean;
}): SetSharePage[] {
  if (input.clip) {
    return ['video', 'poster'];
  }
  if (input.isClipLoading) {
    return ['video'];
  }
  return ['poster'];
}

/**
 * Fully visible when the card is the only or first page; otherwise it follows
 * the swipe towards the card.
 */
function colourRowOpacityFor(
  posterIndex: number,
  pageWidth: number,
  scrollOffset: Animated.Value,
): number | Animated.AnimatedInterpolation<number> {
  if (posterIndex <= 0) {
    return 1;
  }
  return scrollOffset.interpolate({
    inputRange: swatchFadeRange(posterIndex, pageWidth),
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      minHeight: 0,
    },
    mediaSlot: {
      flex: 1,
      minHeight: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    colourRow: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: SHARE_SWATCH_BAND_HEIGHT,
      justifyContent: 'flex-end',
    },
    captureTwin: {
      position: 'absolute',
      top: 0,
    },
    dots: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
      marginTop: spacing.sm,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.border,
    },
    dotOn: {
      backgroundColor: theme.colors.text,
    },
    actions: {
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
      gap: spacing.md,
    },
  });
