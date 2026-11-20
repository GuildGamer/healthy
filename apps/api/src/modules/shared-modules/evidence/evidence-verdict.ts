import type {
  EvidenceValidator,
  EvidenceVerdict,
  GymPhotoInput,
} from './evidence-validator.js';

export const REJECT_UNAVAILABLE =
  'We could not check that photo. Try again in a moment.';
export const REJECT_NOT_GYM =
  'That photo does not show you at a gym. Take another at the gym and try again.';

export const GYM_EXPECTATION = [
  'Accept only if a real person is physically inside a gym or fitness studio.',
  'Gym context must be visible: machines, free weights, racks, cable stacks, a gym floor, studio mirrors, or similar facility equipment.',
  'Reject home workouts, bedrooms, living rooms, parks, streets, cars, offices, empty rooms, screenshots, memes, stock photos, and selfies with no gym behind the person.',
  'Exercising alone is not enough. If you cannot see a gym, reject.',
].join(' ');

export function evidenceInstruction(expectation: string): string {
  return [
    expectation,
    'Reply with JSON only: {"accepted":boolean,"reason":string}.',
    'Reason must be a short sentence the member can read.',
  ].join(' ');
}

export function createEvidenceChecks(
  check: (photo: GymPhotoInput, expectation: string) => Promise<EvidenceVerdict>,
): EvidenceValidator {
  return {
    validateGymPhoto(photo) {
      return check(photo, GYM_EXPECTATION);
    },
    validatePhoto(photo, expectation) {
      return check(photo, expectation);
    },
  };
}

export function parseVerdict(content: string | null | undefined): EvidenceVerdict {
  if (!content) {
    return { accepted: false, reason: REJECT_UNAVAILABLE };
  }

  try {
    const parsed: unknown = JSON.parse(content);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('accepted' in parsed)
    ) {
      return { accepted: false, reason: REJECT_UNAVAILABLE };
    }

    if (parsed.accepted === true) {
      return { accepted: true };
    }

    const reason =
      'reason' in parsed &&
      typeof parsed.reason === 'string' &&
      parsed.reason.trim().length > 0
        ? parsed.reason.trim()
        : REJECT_NOT_GYM;

    return { accepted: false, reason };
  } catch {
    return { accepted: false, reason: REJECT_UNAVAILABLE };
  }
}
