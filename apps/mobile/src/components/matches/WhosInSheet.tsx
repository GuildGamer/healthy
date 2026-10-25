import type { Acquaintance, Crew } from '@product/client';
import { fontWeight, spacing } from '@product/brand';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import {
  DeckSectionTitle,
  DeckSelectRow,
  DeckSheetModal,
  DeckSheetSub,
  DeckSheetTitle,
} from '@/components/deck';
import { type Theme, useThemedStyles } from '@/theme';
import { SheetDone } from './CreateRuleSheets';
import { GroupFaceStack, litFacesFromNames } from './GroupFaceStack';
import { CREATE_COPY } from './match-copy';
import { SheetChoice } from './SheetChoice';

const CREW_STACK_FACES = 3;
/** Rows shown before "Show all": both lists come back most recent first and only grow. */
const COLLAPSED_CREWS = 3;
const COLLAPSED_PEOPLE = 5;

export type WhosInSelection = {
  crewId: string | null;
  participantUserIds: string[];
};

interface WhosInSheetProps {
  visible: boolean;
  onClose: () => void;
  crews: readonly Crew[];
  people: readonly Acquaintance[];
  selection: WhosInSelection;
  onChange: (next: WhosInSelection) => void;
  onRenameCrew?: (crew: Crew) => void;
}

/**
 * Collapsed lists keep the most recent rows plus anything already picked, so a
 * selection never disappears behind "Show all".
 */
function visibleRows<T>(
  rows: readonly T[],
  isExpanded: boolean,
  collapsedCount: number,
  isSelected: (row: T) => boolean,
): readonly T[] {
  if (isExpanded) {
    return rows;
  }
  return rows.filter((row, index) => index < collapsedCount || isSelected(row));
}

/**
 * Link-first by default. People and crews are multi-select shortcuts that seat
 * pending members; the invite link still exists for everyone else.
 */
export function WhosInSheet({
  visible,
  onClose,
  crews,
  people,
  selection,
  onChange,
  onRenameCrew,
}: WhosInSheetProps) {
  const [areCrewsExpanded, setCrewsExpanded] = useState(false);
  const [arePeopleExpanded, setPeopleExpanded] = useState(false);
  const selectedPeople = new Set(selection.participantUserIds);
  const isLinkOnly =
    selection.crewId === null && selection.participantUserIds.length === 0;

  const shownCrews = visibleRows(
    crews,
    areCrewsExpanded,
    COLLAPSED_CREWS,
    (crew) => crew.id === selection.crewId,
  );
  const shownPeople = visibleRows(
    people,
    arePeopleExpanded,
    COLLAPSED_PEOPLE,
    (person) => selectedPeople.has(person.userId),
  );

  function togglePerson(userId: string) {
    const next = new Set(selectedPeople);
    if (next.has(userId)) {
      next.delete(userId);
    } else {
      next.add(userId);
    }
    onChange({
      crewId: selection.crewId,
      participantUserIds: [...next],
    });
  }

  function toggleCrew(crewId: string) {
    onChange({
      crewId: selection.crewId === crewId ? null : crewId,
      participantUserIds: selection.participantUserIds,
    });
  }

  function renameHandlerFor(crew: Crew) {
    if (!crew.isOwner || !onRenameCrew) {
      return undefined;
    }
    return () => onRenameCrew(crew);
  }

  const footer = (
    <>
      {isLinkOnly ? null : <DeckSheetSub>{CREATE_COPY.crewNote}</DeckSheetSub>}
      <SheetDone onClose={onClose} />
    </>
  );

  return (
    <DeckSheetModal
      footer={footer}
      onDismiss={onClose}
      testID="match-create-crew-sheet"
      visible={visible}
    >
      <DeckSheetTitle>{CREATE_COPY.whosInTitle}</DeckSheetTitle>
      <SheetChoice
        glyph="link"
        hint={CREATE_COPY.newGroupHint}
        isSelected={isLinkOnly}
        onPress={() => onChange({ crewId: null, participantUserIds: [] })}
        testID="match-crew-new"
        title={CREATE_COPY.newGroup}
      />
      {crews.length > 0 ? (
        <>
          <DeckSectionTitle corner={String(crews.length)} label={CREATE_COPY.crewsSection} />
          {shownCrews.map((crew, index) => {
            const onLongPress = renameHandlerFor(crew);
            return (
              <DeckSelectRow
                accessibilityHint={onLongPress ? CREATE_COPY.crewRenameHint : undefined}
                isFirst={index === 0}
                isSelected={crew.id === selection.crewId}
                key={crew.id}
                leading={
                  <GroupFaceStack
                    faces={litFacesFromNames(crew.memberNames.slice(0, CREW_STACK_FACES))}
                  />
                }
                meta={CREATE_COPY.crewHint(crew.memberCount + 1)}
                onLongPress={onLongPress}
                onPress={() => toggleCrew(crew.id)}
                testID={`match-crew-${crew.id}`}
                title={crew.name}
              />
            );
          })}
          <ShowAllToggle
            collapsedCount={COLLAPSED_CREWS}
            isExpanded={areCrewsExpanded}
            onToggle={() => setCrewsExpanded((isExpanded) => !isExpanded)}
            testID="match-crews-show-all"
            total={crews.length}
          />
        </>
      ) : null}
      {people.length > 0 ? (
        <>
          <DeckSectionTitle corner={String(people.length)} label={CREATE_COPY.peopleSection} />
          {shownPeople.map((person, index) => (
            <DeckSelectRow
              isFirst={index === 0}
              isSelected={selectedPeople.has(person.userId)}
              key={person.userId}
              leading={<GroupFaceStack faces={litFacesFromNames([person.displayName])} />}
              onPress={() => togglePerson(person.userId)}
              testID={`match-person-${person.userId}`}
              title={person.displayName}
            />
          ))}
          <ShowAllToggle
            collapsedCount={COLLAPSED_PEOPLE}
            isExpanded={arePeopleExpanded}
            onToggle={() => setPeopleExpanded((isExpanded) => !isExpanded)}
            testID="match-people-show-all"
            total={people.length}
          />
        </>
      ) : null}
    </DeckSheetModal>
  );
}

function ShowAllToggle({
  total,
  collapsedCount,
  isExpanded,
  onToggle,
  testID,
}: {
  total: number;
  collapsedCount: number;
  isExpanded: boolean;
  onToggle: () => void;
  testID: string;
}) {
  const styles = useThemedStyles(createStyles);

  if (total <= collapsedCount) {
    return null;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onToggle}
      style={({ pressed }) => [styles.toggle, pressed ? styles.pressed : null]}
      testID={testID}
    >
      <Text style={styles.toggleLabel}>
        {isExpanded ? CREATE_COPY.showFewer : CREATE_COPY.showAll(total)}
      </Text>
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    toggle: {
      paddingVertical: 12,
      paddingHorizontal: spacing.xs,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    pressed: {
      opacity: 0.7,
    },
    toggleLabel: {
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: fontWeight.semibold,
    },
  });
