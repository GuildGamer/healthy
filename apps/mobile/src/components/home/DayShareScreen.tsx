import { fontSize, fontWeight, spacing } from '@product/brand';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SHARE_COPY } from '@/components/challenges/constants/doing-copy';
import { defaultShareFillId, type ShareFillId } from '@/components/challenges/share-fill';
import { ShareFillCarousel } from '@/components/challenges/ShareFillCarousel';
import { DeckButton, DeckNavButton } from '@/components/deck';
import { goBackOrHome } from '@/lib/go-back';
import { type Theme, useThemedStyles } from '@/theme';
import { TODAY_COPY } from './constants/today-copy';
import { DayShareCard } from './DayShareCard';
import { shareDayMessage } from './today-labels';
import type { DayShareContent } from './types/day-share';
import { useShareDay } from './useShareDay';

/** Preview the day’s share card, pick a colour, then hand the PNG to the sheet. */
export function DayShareScreen({ content }: { content: DayShareContent }) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [fillId, setFillId] = useState<ShareFillId>(() => defaultShareFillId('streak'));
  const dayShare = useShareDay(
    shareDayMessage(content.completedCount, content.streakDays),
    TODAY_COPY.shareDay,
  );

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
      <View collapsable={false} ref={dayShare.shotRef} style={styles.posterWrap}>
        <DayShareCard content={content} fillId={fillId} />
      </View>
      <View style={styles.actions}>
        <ShareFillCarousel onSelect={setFillId} selected={fillId} />
        <DeckButton
          glyph="share"
          label={SHARE_COPY.share}
          loading={dayShare.isSharing}
          onPress={() => void dayShare.share()}
          testID="day-share-poster"
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
