import Feather from '@expo/vector-icons/Feather';
import {
  colors,
  fontSize,
  fontWeight,
  spacing,
} from '@product/brand';
import { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ChallengeIcon } from '@/components/challenges/ChallengeIcon';
import {
  healthCategoryMark,
  healthCategoryName,
} from '@/constants/health-categories';
import { tipQuoteFontFamily } from '@/lib/fonts';
import type { TipCategoryGroup } from './select-daily-tip';
import {
  nextRailOffset,
  railOverflow,
} from './tip-section-rail';
import {
  labelForTipScope,
  type TipSectionScope,
} from './tip-section-scope';

export function TipSectionSwitch({
  groups,
  onSelect,
  scope,
}: {
  groups: readonly TipCategoryGroup[];
  onSelect: (scope: TipSectionScope) => void;
  scope: TipSectionScope;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const [offset, setOffset] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const overflow = railOverflow(offset, contentWidth, viewportWidth);

  if (groups.length <= 1) {
    return null;
  }

  function scrollRail(direction: 'back' | 'forward') {
    const next = nextRailOffset(
      offset,
      contentWidth,
      viewportWidth,
      direction,
    );
    scrollRef.current?.scrollTo({ animated: true, x: next });
  }

  return (
    <View style={styles.wrap} testID="tip-section-switch">
      <View style={styles.row}>
        {overflow.canScrollBack ? (
          <RailArrow
            direction="back"
            onPress={() => scrollRail('back')}
          />
        ) : null}
        <ScrollView
          contentContainerStyle={styles.rail}
          horizontal
          nestedScrollEnabled
          onContentSizeChange={(width) => setContentWidth(width)}
          onLayout={(event) => setViewportWidth(event.nativeEvent.layout.width)}
          onScroll={(event) => setOffset(event.nativeEvent.contentOffset.x)}
          ref={scrollRef}
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
        >
          <ScopeMark
            isSelected={scope === 'all'}
            label="All tips"
            onPress={() => onSelect('all')}
            testID="tip-section-all"
          />
          {groups.map((group) => (
            <ScopeMark
              category={group.category}
              isSelected={scope === group.category}
              key={group.category}
              label={healthCategoryName(group.category)}
              onPress={() => onSelect(group.category)}
              testID={`tip-section-${group.category}`}
            />
          ))}
        </ScrollView>
        {overflow.canScrollForward ? (
          <RailArrow
            direction="forward"
            onPress={() => scrollRail('forward')}
          />
        ) : null}
      </View>
      <Text style={styles.scopeTitle}>{labelForTipScope(scope)}</Text>
    </View>
  );
}

function RailArrow({
  direction,
  onPress,
}: {
  direction: 'back' | 'forward';
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={
        direction === 'back' ? 'Earlier sections' : 'More sections'
      }
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={styles.arrow}
      testID={`tip-section-${direction}`}
    >
      <Feather
        color={colors.muted}
        name={direction === 'back' ? 'chevron-left' : 'chevron-right'}
        size={18}
      />
    </Pressable>
  );
}

function ScopeMark({
  category,
  isSelected,
  label,
  onPress,
  testID,
}: {
  category?: TipCategoryGroup['category'];
  isSelected: boolean;
  label: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="tab"
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.mark,
        isSelected ? styles.markSelected : null,
        pressed ? styles.markPressed : null,
      ]}
      testID={testID}
    >
      {category ? (
        <ChallengeIcon
          category={category}
          name={healthCategoryMark(category)}
        />
      ) : (
        <Text
          style={[styles.allLabel, isSelected ? styles.allLabelSelected : null]}
        >
          All
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 4,
    paddingHorizontal: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 2,
  },
  arrow: {
    width: 28,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 28,
    paddingBottom: 5,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  markSelected: {
    borderBottomColor: colors.accent,
  },
  markPressed: {
    opacity: 0.7,
  },
  allLabel: {
    color: colors.muted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.3,
    lineHeight: 28,
  },
  allLabelSelected: {
    color: colors.accent,
  },
  scopeTitle: {
    color: colors.text,
    fontFamily: tipQuoteFontFamily,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
});
