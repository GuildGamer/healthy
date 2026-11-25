import { spacing } from '@product/brand';
import { useRef, useState, type ReactNode, type RefObject } from 'react';
import {
  ActivityIndicator,
  FlatList,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { DeckButton } from '@/components/deck';
import type { ShareDestinationId } from '@/components/matches/share-destination';
import type { SharePayload } from '@/components/matches/share-destination';
import type { ShareRoutePoint } from '@/lib/share-route-path';
import { type Theme, useThemedStyles } from '@/theme';
import {
  GYM_PHOTO_SHARE_ASPECT,
  GYM_PHOTO_SHARE_HEIGHT,
  GYM_PHOTO_SHARE_WIDTH,
  GymPhotoShareCard,
} from '@/components/challenges/GymPhotoShareCard';
import { ShareFillCarousel } from '@/components/challenges/ShareFillCarousel';
import {
  SHARE_POSTER_HEIGHT,
  SHARE_POSTER_WIDTH,
  SharePosterCard,
} from '@/components/challenges/SharePosterCard';
import type { ShareFillId } from '@/components/challenges/share-fill';
import type { SharePoster } from '@/components/challenges/types/share-poster';
import { ProofVideoPlayer } from '@/components/challenges/ProofVideoPlayer';
import { SHARE_COPY } from '@/components/challenges/constants/doing-copy';
import {
  SHARE_STORIES_FRAME_HEIGHT,
  SHARE_STORIES_FRAME_WIDTH,
} from '@/lib/share-export';
import { ShareDestinationSheet } from './ShareDestinationSheet';
import { ShareSocialFrame } from './ShareSocialFrame';
import { useShareDestinations } from './useShareDestinations';

export type SetSharePage = 'video' | 'photo' | 'poster';

export type SetShareClipMedia = {
  /** URI shown on the video page (local file or remote). */
  playUri: string;
  /** Local (or shareable) full clip for destinations. */
  shareUri: string;
  socialShareUri?: string | null;
  posterFrameUri?: string | null;
};

type SetSharePagerProps = {
  clip: SetShareClipMedia | null;
  isClipLoading?: boolean;
  /** Override the default video player (e.g. ProofClipHero on finish). */
  renderVideo?: (clip: SetShareClipMedia) => ReactNode;
  poster: SharePoster;
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
  /** Horizontal inset for the foot. Default matches clip finish. */
  actionsInset?: number;
  pagerTestID?: string;
  listTestID?: string;
  posterTestID?: string;
};

const MEDIA_ASPECT = 9 / 16;
const POSTER_ASPECT = SHARE_POSTER_WIDTH / SHARE_POSTER_HEIGHT;
/** Leave air above/below so a gym photo reads as a photo, not a full-bleed reel. */
const PHOTO_SLOT_HEIGHT_FRACTION = 0.72;

/**
 * Video / photo ↔ poster pager for any set share. Colour swatches only on the
 * poster page. One Share button opens the destination sheet for the page in front.
 *
 * Square capture twins sit outside the FlatList — list cells clip off-screen
 * children, and view-shot then exports a blank white PNG.
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
  const pages = sharePages({ clip, isClipLoading, photoUri });
  const [activePage, setActivePage] = useState<SetSharePage>(() => pages[0] ?? 'poster');
  const [slot, setSlot] = useState({ width: 0, height: 0 });
  const [sheetPayload, setSheetPayload] = useState<SharePayload | null>(null);

  const showPosterPage = activePage === 'poster';
  const showPhotoPage = activePage === 'photo';
  const pageWidth = slot.width > 0 ? slot.width : Math.max(windowWidth - spacing.lg * 2, 1);
  const mediaAspect = aspectForPage(activePage);
  const fitted = fitPortraitMedia(pageWidth, slot.height, mediaAspect);
  const mediaSize = showPhotoPage
    ? limitHeight(fitted, slot.height * PHOTO_SLOT_HEIGHT_FRACTION)
    : fitted;
  const designWidth = showPhotoPage ? GYM_PHOTO_SHARE_WIDTH : SHARE_POSTER_WIDTH;
  const cardScale =
    mediaSize.width === 0 || mediaSize.width > designWidth
      ? 1
      : mediaSize.width / designWidth;

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
      (activePage === 'photo' ? photoShotRef : posterShotRef) as RefObject<View | null>,
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
            extraData={`${pageWidth}:${mediaSize.width}:${mediaSize.height}:${activePage}`}
            getItemLayout={(_, index) => ({
              length: pageWidth,
              offset: pageWidth * index,
              index,
            })}
            horizontal
            initialNumToRender={2}
            keyExtractor={(item) => item}
            onMomentumScrollEnd={onScrollEnd}
            pagingEnabled
            testID={listTestID}
            renderItem={({ item }) => (
              <View style={[styles.page, { width: pageWidth }]}>
                <View
                  style={[
                    styles.mediaFrame,
                    { width: mediaSize.width, height: mediaSize.height },
                    item === 'video' ? styles.mediaFrameVideo : null,
                  ]}
                >
                  {item === 'video' && clip ? (
                    <View style={styles.videoFill}>
                      {renderVideo ? (
                        renderVideo(clip)
                      ) : (
                        <ProofVideoPlayer
                          contentFit="contain"
                          fillParent
                          posterUri={clip.posterFrameUri}
                          uri={clip.playUri}
                        />
                      )}
                    </View>
                  ) : null}
                  {item === 'photo' && photoUri ? (
                    <View
                      style={{ transform: [{ scale: cardScale }] }}
                      testID="clip-finish-photo"
                    >
                      <GymPhotoShareCard
                        corners="round"
                        photoUri={photoUri}
                        poster={poster}
                        runLine={runLine}
                        testID="gym-photo-share-card"
                      />
                    </View>
                  ) : null}
                  {item === 'poster' ? (
                    <View
                      style={{ transform: [{ scale: cardScale }] }}
                      testID={posterTestID}
                    >
                      <SharePosterCard
                        corners="round"
                        fillId={fillId}
                        poster={poster}
                        routePoints={routePoints}
                        runLine={runLine}
                        testID="share-poster-image"
                      />
                    </View>
                  ) : null}
                </View>
              </View>
            )}
            showsHorizontalScrollIndicator={false}
            style={{ width: pageWidth }}
          />
        )}
      </View>
      {photoUri ? (
        <View
          accessibilityElementsHidden
          collapsable={false}
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          ref={photoShotRef}
          style={[
            styles.captureTwin,
            {
              left: -SHARE_STORIES_FRAME_WIDTH * 4,
              width: SHARE_STORIES_FRAME_WIDTH,
              height: SHARE_STORIES_FRAME_HEIGHT,
            },
          ]}
          testID="gym-photo-share-capture-host"
        >
          <ShareSocialFrame
            cardHeight={GYM_PHOTO_SHARE_HEIGHT}
            cardWidth={GYM_PHOTO_SHARE_WIDTH}
          >
            <GymPhotoShareCard
              corners="square"
              photoUri={photoUri}
              poster={poster}
              runLine={runLine}
              testID="gym-photo-share-card-capture"
            />
          </ShareSocialFrame>
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
            left: -SHARE_STORIES_FRAME_WIDTH * 4,
            width: SHARE_STORIES_FRAME_WIDTH,
            height: SHARE_STORIES_FRAME_HEIGHT,
          },
        ]}
        testID="share-poster-capture-host"
      >
        <ShareSocialFrame cardHeight={SHARE_POSTER_HEIGHT} cardWidth={SHARE_POSTER_WIDTH}>
          <SharePosterCard
            corners="square"
            fillId={fillId}
            poster={poster}
            routePoints={routePoints}
            runLine={runLine}
            testID="share-poster-image-capture"
          />
        </ShareSocialFrame>
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
        {showPosterPage ? (
          <ShareFillCarousel onSelect={onSelectFill} selected={fillId} />
        ) : null}
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
  photoUri?: string | null;
}): SetSharePage[] {
  if (input.clip) {
    return ['video', 'poster'];
  }
  if (input.isClipLoading) {
    return ['video'];
  }
  if (input.photoUri) {
    return ['photo', 'poster'];
  }
  return ['poster'];
}

function aspectForPage(page: SetSharePage): number {
  if (page === 'photo') {
    return GYM_PHOTO_SHARE_ASPECT;
  }
  if (page === 'poster') {
    return POSTER_ASPECT;
  }
  return MEDIA_ASPECT;
}

/** Largest box of the given aspect that fits inside the measured media slot. */
function fitPortraitMedia(
  maxWidth: number,
  maxHeight: number,
  aspect: number = MEDIA_ASPECT,
): { width: number; height: number } {
  if (maxWidth <= 0 || maxHeight <= 0) {
    return { width: 0, height: 0 };
  }
  const heightFromWidth = maxWidth / aspect;
  if (heightFromWidth <= maxHeight) {
    return { width: maxWidth, height: heightFromWidth };
  }
  return { width: maxHeight * aspect, height: maxHeight };
}

function limitHeight(
  size: { width: number; height: number },
  maxHeight: number,
): { width: number; height: number } {
  if (size.height <= 0 || maxHeight <= 0 || size.height <= maxHeight) {
    return size;
  }
  const scale = maxHeight / size.height;
  return { width: size.width * scale, height: maxHeight };
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
    page: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 0,
    },
    mediaFrame: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    mediaFrameVideo: {
      // Stretch the player to the fitted 9:16 box — `alignItems: center` alone
      // collapses a flex-fill video down to the play badge.
      alignItems: 'stretch',
      justifyContent: 'flex-start',
      overflow: 'hidden',
      borderRadius: 12,
    },
    videoFill: {
      flex: 1,
      width: '100%',
      height: '100%',
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
