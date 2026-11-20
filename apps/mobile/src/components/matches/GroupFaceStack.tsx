import type { MatchStanding } from '@product/client';
import { StyleSheet, View } from 'react-native';
import { GroupFace } from './GroupFace';
import { type FaceLook, faceLookFor } from './group-today';

const STACK_FACE_SIZE = 30;
const STACK_OVERLAP = -8;

export type StackFace = { id: string; name: string; image: string | null; look: FaceLook };

/** Faces lit for anyone done today. */
export function stackFacesFrom(standings: readonly MatchStanding[]): StackFace[] {
  return standings.map((standing) => ({
    id: standing.userId,
    name: standing.displayName,
    image: standing.image ?? null,
    look: faceLookFor(standing),
  }));
}

/** Faces for a card about who is in, rather than who has done today. */
export function litFacesFromNames(names: readonly string[]): StackFace[] {
  return names.map((name, index) => ({ id: `${name}-${index}`, name, image: null, look: 'lit' }));
}

/** Overlapping small faces. */
export function GroupFaceStack({
  faces,
  testID,
}: {
  faces: readonly StackFace[];
  testID?: string;
}) {
  return (
    <View style={styles.stack} testID={testID}>
      {faces.map((face, index) => (
        <View key={face.id} style={index === 0 ? null : styles.overlap}>
          <GroupFace
            hasEdge
            image={face.image}
            look={face.look}
            name={face.name}
            size={STACK_FACE_SIZE}
            testID={testID ? `${testID}-${face.id}` : undefined}
            userId={face.id}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    flexDirection: 'row',
  },
  overlap: {
    marginLeft: STACK_OVERLAP,
  },
});
