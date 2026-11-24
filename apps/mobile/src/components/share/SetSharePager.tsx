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
import { GymPhotoShareCard } from '@/components/challenges/GymPhotoShareCard';
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
import { ShareCapture } from './ShareCapture';
import { ShareDestinationSheet } from './ShareDestinationSheet';
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

/**
 * Video / photo ↔ poster pager for any set share. Colour swatches only on the
 * poster page. One Share button opens the destination sheet for the page in front.
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
  const mediaAspect = showPhotoPage ? POSTER_ASPECT : MEDIA_ASPECT;
  const mediaSize = fitPortraitMedia(pageWidth, slot.height, mediaAspect);
  const posterScale =
    mediaSize.width === 0 || mediaSize.width > SHARE_POSTER_WIDTH
      ? 1
      : mediaSize.width / SHARE_POSTER_WIDTH;

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
                    <ShareCapture shotRef={photoShotRef}>
                      {(corners) => (
                        <View
                          style={{ transform: [{ scale: posterScale }] }}
                          testID={corners === 'round' ? 'clip-finish-photo' : undefined}
                        >
                          <GymPhotoShareCard
                            corners={corners}
                            photoUri={photoUri}
                            poster={poster}
                            runLine={runLine}
                            testID={
                              corners === 'round'
                                ? 'gym-photo-share-card'
                                : 'gym-photo-share-card-capture'
                            }
                          />
                        </View>
                      )}
                    </ShareCapture>
                  ) : null}
                  {item === 'poster' ? (
                    <ShareCapture shotRef={posterShotRef}>
                      {(corners) => (
                        <View
                          style={{ transform: [{ scale: posterScale }] }}
                          testID={corners === 'round' ? posterTestID : undefined}
                        >
                          <SharePosterCard
                            corners={corners}
                            fillId={fillId}
                            poster={poster}
                            routePoints={routePoints}
                            runLine={runLine}
                            testID={
                              corners === 'round'
                                ? 'share-poster-image'
                                : 'share-poster-image-capture'
                            }
                          />
                        </View>
                      )}
                    </ShareCapture>
                  ) : null}
                </View>
              </View>
            )}
            showsHorizontalScrollIndicator={false}
            style={{ width: pageWidth }}
          />
        )}
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
      overflow: 'hidden',
    },
    mediaFrameVideo: {
      // Stretch the player to the fitted 9:16 box — `alignItems: center` alone
      // collapses a flex-fill video down to the play badge.
      alignItems: 'stretch',
      justifyContent: 'flex-start',
      borderRadius: 12,
    },
    videoFill: {
      flex: 1,
      width: '100%',
      height: '100%',
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
