/**
 * Splits a string into plain and emoji runs so share cards can paint emoji
 * without a custom fontFamily or textShadow (both blank Apple Color Emoji).
 */

/** Extended pictographs, symbols, and common emoji presentation ranges. */
const EMOJI_RUN =
  /(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})(?:\uFE0F|\uFE0E)?(?:\u200D(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})(?:\uFE0F|\uFE0E)?)*/gu;

export type ShareTextRun = {
  text: string;
  isEmoji: boolean;
};

/** Breaks `value` into alternating plain and emoji runs. Empty input yields []. */
export function splitShareTextRuns(value: string): ShareTextRun[] {
  if (value.length === 0) {
    return [];
  }

  const runs: ShareTextRun[] = [];
  let cursor = 0;

  for (const match of value.matchAll(EMOJI_RUN)) {
    const start = match.index ?? 0;
    if (start > cursor) {
      runs.push({ text: value.slice(cursor, start), isEmoji: false });
    }
    runs.push({ text: match[0], isEmoji: true });
    cursor = start + match[0].length;
  }

  if (cursor < value.length) {
    runs.push({ text: value.slice(cursor), isEmoji: false });
  }

  return runs;
}
