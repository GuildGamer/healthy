import type { BoardFact } from './types/board';

/** What the board is, with what other people see of you first. */
export function boardFacts(publicName: string): BoardFact[] {
  return [
    {
      glyph: 'you',
      line: `Others see you as “${publicName}” and your points.`,
      detail: 'Nothing about your health. Change your name in Settings, under Profile.',
    },
    {
      glyph: 'calendar',
      line: 'It starts again every Monday.',
      detail: 'Everyone begins the week at zero.',
    },
    {
      glyph: 'check',
      line: 'Points come from finishing challenges.',
      detail: 'Practice doesn’t count. A missed photo check takes points off.',
    },
    {
      glyph: 'eyeOff',
      line: 'You can hide from it any time.',
      detail: 'In Settings, under Privacy.',
    },
  ];
}
