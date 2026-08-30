export type ChallengeDetailTab = 'details' | 'history';

export const CHALLENGE_DETAIL_TABS: readonly {
  id: ChallengeDetailTab;
  label: string;
}[] = [
  { id: 'details', label: 'Details' },
  { id: 'history', label: 'History' },
];
