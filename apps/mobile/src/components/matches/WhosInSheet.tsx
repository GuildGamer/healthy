import type { Acquaintance, Crew } from '@product/client';
import { DeckSheetModal, DeckSheetSub, DeckSheetTitle } from '@/components/deck';
import { SheetDone } from './CreateRuleSheets';
import { GroupFaceStack, litFacesFromNames } from './GroupFaceStack';
import { CREATE_COPY } from './match-copy';
import { SheetChoice } from './SheetChoice';

const CREW_STACK_FACES = 3;

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
  const selectedPeople = new Set(selection.participantUserIds);
  const isLinkOnly =
    selection.crewId === null && selection.participantUserIds.length === 0;

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

  return (
    <DeckSheetModal onDismiss={onClose} testID="match-create-crew-sheet" visible={visible}>
      <DeckSheetTitle>{CREATE_COPY.whosInTitle}</DeckSheetTitle>
      <SheetChoice
        glyph="link"
        hint={CREATE_COPY.newGroupHint}
        isSelected={isLinkOnly}
        onPress={() => onChange({ crewId: null, participantUserIds: [] })}
        testID="match-crew-new"
        title={CREATE_COPY.newGroup}
      />
      {people.length > 0 ? (
        <>
          <DeckSheetSub>{CREATE_COPY.peopleSection}</DeckSheetSub>
          {people.map((person) => (
            <SheetChoice
              hint={CREATE_COPY.personHint}
              isSelected={selectedPeople.has(person.userId)}
              key={person.userId}
              leading={
                <GroupFaceStack faces={litFacesFromNames([person.displayName])} />
              }
              onPress={() => togglePerson(person.userId)}
              testID={`match-person-${person.userId}`}
              title={person.displayName}
            />
          ))}
        </>
      ) : null}
      {crews.length > 0 ? (
        <>
          <DeckSheetSub>{CREATE_COPY.crewsSection}</DeckSheetSub>
          {crews.map((crew) => (
            <SheetChoice
              hint={
                crew.isOwner && onRenameCrew
                  ? CREATE_COPY.crewHintRename(crew.memberCount + 1)
                  : CREATE_COPY.crewHint(crew.memberCount + 1)
              }
              isSelected={crew.id === selection.crewId}
              key={crew.id}
              leading={
                <GroupFaceStack
                  faces={litFacesFromNames(crew.memberNames.slice(0, CREW_STACK_FACES))}
                />
              }
              onPress={() => toggleCrew(crew.id)}
              onLongPress={
                crew.isOwner && onRenameCrew ? () => onRenameCrew(crew) : undefined
              }
              testID={`match-crew-${crew.id}`}
              title={crew.name}
            />
          ))}
        </>
      ) : null}
      <DeckSheetSub>{CREATE_COPY.crewNote}</DeckSheetSub>
      <SheetDone onClose={onClose} />
    </DeckSheetModal>
  );
}
