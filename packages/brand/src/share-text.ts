/**
 * Splits a string into plain and emoji runs so share cards can paint emoji
 * without a custom fontFamily or textShadow (both blank Apple Color Emoji),
 * and so OG renderers can load emoji assets per grapheme.
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
    const matched = match[0];
    cursor = start + matched.length;
  }

  if (cursor < value.length) {
    runs.push({ text: value.slice(cursor), isEmoji: false });
  }

  return runs;
}

/** Unique emoji graphemes in order of first appearance. */
export function collectEmojiGraphemes(value: string): string[] {
  const seen = new Set<string>();
  const graphemes: string[] = [];
  for (const run of splitShareTextRuns(value)) {
    if (!run.isEmoji || seen.has(run.text)) {
      continue;
    }
    seen.add(run.text);
    graphemes.push(run.text);
  }
  return graphemes;
}

/** Removes emoji runs and collapses leftover whitespace for OG fallbacks. */
export function stripEmojiRuns(value: string): string {
  return splitShareTextRuns(value)
    .filter((run) => !run.isEmoji)
    .map((run) => run.text)
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}
