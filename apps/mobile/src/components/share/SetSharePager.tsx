import { spacing } from '@product/brand';
import { useState, type ReactNode } from 'react';
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
import { ShareFillCarousel } from '@/components/challenges/ShareFillCarousel';
import {
  SHARE_POSTER_WIDTH,
  SharePosterCard,
} from '@/components/challenges/SharePosterCard';
import type { ShareFillId } from '@/components/challenges/share-fill';
import type { SharePoster } from '@/components/challenges/types/share-poster';
import { ProofVideoPlayer } from '@/components/challenges/ProofVideoPlayer';
import { SHARE_COPY } from '@/components/challenges/constants/doing-copy';
import { ShareDestinationSheet } from './ShareDestinationSheet';
import { useShareDestinations } from './useShareDestinations';

export type SetSharePage = 'video' | 'poster';

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

const PAGES_WITH_CLIP: SetSharePage[] = ['video', 'poster'];
const MEDIA_ASPECT = 9 / 16;

/**
 * Video ↔ poster pager for any set share. Colour swatches only on the poster
 * page. One Share button opens the destination sheet for the page in front.
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
  const [activePage, setActivePage] = useState<SetSharePage>('video');
  const [slot, setSlot] = useState({ width: 0, height: 0 });
  const [sheetPayload, setSheetPayload] = useState<SharePayload | null>(null);

  const pages: SetSharePage[] = clip
    ? PAGES_WITH_CLIP
    : isClipLoading
      ? (['video'] as SetSharePage[])
      : (['poster'] as SetSharePage[]);
  const showPosterPage = !clip ? !isClipLoading : activePage === 'poster';
  const pageWidth = slot.width > 0 ? slot.width : Math.max(windowWidth - spacing.lg * 2, 1);
  const mediaSize = fitPortraitMedia(pageWidth, slot.height);
  const posterScale =
    mediaSize.width === 0 || mediaSize.width > SHARE_POSTER_WIDTH
      ? 1
      : mediaSize.width / SHARE_POSTER_WIDTH;

  const destinations = useShareDestinations({
    buildPayload: () => {
      if (showPosterPage || !clip) {
        return {
          caption,
          inviteUrl,
          artifact: { kind: 'image' as const },
        };
      }
      return {
        caption,
        inviteUrl,
        artifact: {
          kind: 'video' as const,
          clipUri: clip.shareUri,
          socialClipUri: clip.socialShareUri ?? null,
        },
      };
    },
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
            extraData={`${pageWidth}:${mediaSize.width}:${mediaSize.height}`}
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
                <View style={[styles.mediaFrame, mediaSize]}>
                  {item === 'video' && clip ? (
                    renderVideo ? (
                      renderVideo(clip)
                    ) : (
                      <ProofVideoPlayer
                        contentFit="contain"
                        fillParent
                        posterUri={clip.posterFrameUri}
                        uri={clip.playUri}
                      />
                    )
                  ) : null}
                  {item === 'poster' ? (
                    <View
                      collapsable={false}
                      ref={destinations.shotRef}
                      style={[styles.posterCapture, { transform: [{ scale: posterScale }] }]}
                      testID={posterTestID}
                    >
                      <SharePosterCard
                        fillId={fillId}
                        photoUri={photoUri ?? undefined}
                        poster={poster}
                        routePoints={routePoints}
                        runLine={runLine}
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

/** Largest 9:16 box that fits inside the measured media slot. */
function fitPortraitMedia(maxWidth: number, maxHeight: number): { width: number; height: number } {
  if (maxWidth <= 0 || maxHeight <= 0) {
    return { width: 0, height: 0 };
  }
  const heightFromWidth = maxWidth / MEDIA_ASPECT;
  if (heightFromWidth <= maxHeight) {
    return { width: maxWidth, height: heightFromWidth };
  }
  return { width: maxHeight * MEDIA_ASPECT, height: maxHeight };
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
      borderRadius: 12,
    },
    posterCapture: {
      alignItems: 'center',
      justifyContent: 'center',
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
