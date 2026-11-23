import { fontSize, fontWeight, spacing } from '@product/brand';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SHARE_COPY } from '@/components/challenges/constants/doing-copy';
import { defaultShareFillId, type ShareFillId } from '@/components/challenges/share-fill';
import { ShareFillCarousel } from '@/components/challenges/ShareFillCarousel';
import { DeckNavButton } from '@/components/deck';
import { ShareDestinationRow, useShareDestinations } from '@/components/share';
import { goBackOrHome } from '@/lib/go-back';
import { type Theme, useThemedStyles } from '@/theme';
import { DayShareCard } from './DayShareCard';
import { shareDayMessage } from './today-labels';
import type { DayShareContent } from './types/day-share';

/** Preview the day’s share card, pick a colour, then send it to a destination. */
export function DayShareScreen({ content }: { content: DayShareContent }) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [fillId, setFillId] = useState<ShareFillId>(() => defaultShareFillId('streak'));
  const caption = shareDayMessage(content.completedCount, content.streakDays);
  const destinations = useShareDestinations({
    buildPayload: () => ({
      caption,
      artifact: { kind: 'image' },
    }),
  });

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
      <View collapsable={false} ref={destinations.shotRef} style={styles.posterWrap}>
        <DayShareCard content={content} fillId={fillId} />
      </View>
      <View style={styles.actions}>
        <ShareFillCarousel onSelect={setFillId} selected={fillId} />
        <ShareDestinationRow
          disabled={destinations.isBusy}
          onSelect={destinations.select}
          showCopy={false}
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
