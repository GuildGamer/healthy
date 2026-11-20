/**
 * Re-exports share-text helpers from `@product/brand` so mobile share cards
 * and website OG renderers stay on one emoji split.
 */
export {
  collectEmojiGraphemes,
  splitShareTextRuns,
  stripEmojiRuns,
  type ShareTextRun,
} from '@product/brand';
