import { fontSize, fontWeight, spacing } from '@product/brand';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SHARE_COPY } from '@/components/challenges/constants/doing-copy';
import { defaultShareFillId, type ShareFillId } from '@/components/challenges/share-fill';
import { ShareFillCarousel } from '@/components/challenges/ShareFillCarousel';
import { DeckButton, DeckNavButton } from '@/components/deck';
import type { SharePayload } from '@/components/matches/share-destination';
import {
  SHARE_PAGE_MARGIN,
  ShareCapture,
  ShareDestinationSheet,
  useShareDestinations,
} from '@/components/share';
import { goBackOrHome } from '@/lib/go-back';
import { type Theme, useThemedStyles } from '@/theme';
import { DayShareCard } from './DayShareCard';
import { shareDayMessage } from './today-labels';
import type { DayShareContent } from './types/day-share';

/** Preview the day’s share card, pick a colour, then Share opens destinations. */
export function DayShareScreen({ content }: { content: DayShareContent }) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [fillId, setFillId] = useState<ShareFillId>(() => defaultShareFillId('streak'));
  const [sheetPayload, setSheetPayload] = useState<SharePayload | null>(null);
  const caption = shareDayMessage(content.completedCount, content.streakDays);
  const destinations = useShareDestinations({
    buildPayload: () => ({
      caption,
      artifact: { kind: 'image' },
    }),
  });

  async function onSharePress() {
    if (destinations.isBusy) {
      return;
    }
    const payload = await destinations.preparePayload();
    if (!payload) {
      return;
    }
    setSheetPayload(payload);
  }

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.md },
      ]}
      testID="day-share-screen"
    >
      <View style={styles.nav}>
        <DeckNavButton
          accessibilityLabel={SHARE_COPY.close}
          glyph="close"
          onPress={() => goBackOrHome()}
          testID="day-share-close"
        />
        <Text style={styles.navTitle}>{SHARE_COPY.title}</Text>
        <View style={styles.navSpacer} />
      </View>
      <ShareCapture fitToSlot shotRef={destinations.shotRef}>
        {(corners, size) => (
          <DayShareCard
            content={content}
            corners={corners}
            fillId={fillId}
            height={size.height}
            width={size.width}
          />
        )}
      </ShareCapture>
      <View style={styles.actions}>
        <ShareFillCarousel onSelect={setFillId} selected={fillId} />
        <DeckButton
          disabled={destinations.isBusy}
          label={SHARE_COPY.share}
          onPress={() => void onSharePress()}
          testID="day-share-open"
        />
      </View>
      {sheetPayload ? (
        <ShareDestinationSheet
          onClose={() => setSheetPayload(null)}
          payload={sheetPayload}
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
      paddingHorizontal: SHARE_PAGE_MARGIN,
    },
    nav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    navTitle: {
      color: theme.colors.text,
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
    },
    navSpacer: {
      width: 40,
    },
    actions: {
      marginTop: spacing.md,
      gap: spacing.sm,
    },
  });
