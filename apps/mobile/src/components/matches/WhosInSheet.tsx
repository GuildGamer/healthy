import type { Crew } from '@product/client';
import { DeckSheetModal, DeckSheetSub, DeckSheetTitle } from '@/components/deck';
import { SheetDone } from './CreateRuleSheets';
import { GroupFaceStack, litFacesFromNames } from './GroupFaceStack';
import { CREATE_COPY } from './match-copy';
import { SheetChoice } from './SheetChoice';

const CREW_STACK_FACES = 3;

interface WhosInSheetProps {
  visible: boolean;
  onClose: () => void;
  crews: readonly Crew[];
  crewId: string | null;
  onChoose: (crewId: string | null) => void;
}

/** New group by link, or a crew saved from an earlier group, seated straight away. */
export function WhosInSheet({ visible, onClose, crews, crewId, onChoose }: WhosInSheetProps) {
  return (
    <DeckSheetModal onDismiss={onClose} testID="match-create-crew-sheet" visible={visible}>
      <DeckSheetTitle>{CREATE_COPY.whosInTitle}</DeckSheetTitle>
      <SheetChoice
        glyph="link"
        hint={CREATE_COPY.newGroupHint}
        isSelected={crewId === null}
        onPress={() => onChoose(null)}
        testID="match-crew-new"
        title={CREATE_COPY.newGroup}
      />
      {crews.map((crew) => (
        <SheetChoice
          hint={CREATE_COPY.crewHint(crew.memberCount + 1)}
          isSelected={crew.id === crewId}
          key={crew.id}
          leading={
            <GroupFaceStack
              faces={litFacesFromNames(crew.memberNames.slice(0, CREW_STACK_FACES))}
            />
          }
          onPress={() => onChoose(crew.id)}
          testID={`match-crew-${crew.id}`}
          title={crew.name}
        />
      ))}
      <DeckSheetSub>{CREATE_COPY.crewNote}</DeckSheetSub>
      <SheetDone onClose={onClose} />
    </DeckSheetModal>
  );
}
