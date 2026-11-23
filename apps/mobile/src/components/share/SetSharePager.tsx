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
import type { ShareDestinationId } from '@/components/matches/share-destination';
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
import { SHARE_DEST_COPY } from './constants/share-copy';
import { ShareDestinationRow } from './ShareDestinationRow';
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
  /** Errors / notes above the destination row. */
  messages?: ReactNode;
  /** Board switch and status lines under destinations. */
  footer?: ReactNode;
  /** Horizontal inset for the destination foot. Default matches clip finish. */
  actionsInset?: number;
  pagerTestID?: string;
  listTestID?: string;
  posterTestID?: string;
};

const PAGES_WITH_CLIP: SetSharePage[] = ['video', 'poster'];

/**
 * Video ↔ poster pager for any set share. Colour swatches only on the poster
 * page. Destinations send the artifact for the page in front.
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
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const pageWidth = measuredWidth > 0 ? measuredWidth : Math.max(windowWidth - spacing.lg * 2, 1);

  const pages: SetSharePage[] = clip
    ? PAGES_WITH_CLIP
    : isClipLoading
      ? (['video'] as SetSharePage[])
      : (['poster'] as SetSharePage[]);
  const showPosterPage = !clip ? !isClipLoading : activePage === 'poster';
  const posterScale =
    pageWidth === 0 || pageWidth > SHARE_POSTER_WIDTH ? 1 : pageWidth / SHARE_POSTER_WIDTH;

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

  function onCarouselLayout(event: LayoutChangeEvent) {
    const nextWidth = event.nativeEvent.layout.width;
    if (nextWidth <= 0) {
      return;
    }
    setMeasuredWidth((current) => (current > 0 ? current : nextWidth));
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

  function onSelectDestination(id: Parameters<typeof destinations.select>[0]) {
    if (id !== 'challenge') {
      onShared?.(id);
    }
    destinations.select(id);
  }

  return (
    <>
      <View onLayout={onCarouselLayout} style={styles.pager} testID={pagerTestID}>
        {isClipLoading ? (
          <ActivityIndicator />
        ) : (
          <FlatList
            data={pages}
            extraData={pageWidth}
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
                {item === 'video' && clip ? (
                  renderVideo ? (
                    renderVideo(clip)
                  ) : (
                    <ProofVideoPlayer
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
            )}
            showsHorizontalScrollIndicator={false}
            style={{ width: pageWidth }}
          />
        )}
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
      </View>
      <View style={[styles.actions, { paddingHorizontal: actionsInset }]}>
        {messages}
        {showPosterPage ? (
          <ShareFillCarousel onSelect={onSelectFill} selected={fillId} />
        ) : null}
        <ShareDestinationRow
          disabled={destinationsDisabled || destinations.isBusy}
          onSelect={onSelectDestination}
          showChallenge={showChallenge}
          showCopy={showCopy}
        />
        {footer}
      </View>
    </>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    pager: {
      flex: 1,
      minHeight: 0,
      paddingTop: spacing.md,
      alignItems: 'center',
    },
    page: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
      minHeight: 0,
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
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
      gap: spacing.md,
    },
  });
