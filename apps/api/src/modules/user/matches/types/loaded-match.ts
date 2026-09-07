import type {
  Match,
  MatchAttempt,
  MatchParticipant,
  User,
  UserProfile,
} from '@product/db';

export type LoadedParticipant = MatchParticipant & {
  user: User & { profile: UserProfile | null };
};

export type LoadedMatch = Match & {
  hostUser: User & { profile: UserProfile | null };
  participants: LoadedParticipant[];
  attempts: MatchAttempt[];
};
