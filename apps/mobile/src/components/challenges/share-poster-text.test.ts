import { splitShareTextRuns } from './share-poster-text';

describe('splitShareTextRuns', () => {
  it('returns an empty list for an empty string', () => {
    expect(splitShareTextRuns('')).toEqual([]);
  });

  it('keeps plain text as one run', () => {
    expect(splitShareTextRuns('Morning walk')).toEqual([
      { text: 'Morning walk', isEmoji: false },
    ]);
  });

  it('splits a leading emoji from the title', () => {
    expect(splitShareTextRuns('🚶 Morning walk')).toEqual([
      { text: '🚶', isEmoji: true },
      { text: ' Morning walk', isEmoji: false },
    ]);
  });

  it('splits emoji in the middle', () => {
    expect(splitShareTextRuns('Walk 🔥 done')).toEqual([
      { text: 'Walk ', isEmoji: false },
      { text: '🔥', isEmoji: true },
      { text: ' done', isEmoji: false },
    ]);
  });

  it('keeps a ZWJ sequence as one emoji run', () => {
    expect(splitShareTextRuns('Family 👨‍👩‍👧 day')).toEqual([
      { text: 'Family ', isEmoji: false },
      { text: '👨‍👩‍👧', isEmoji: true },
      { text: ' day', isEmoji: false },
    ]);
  });
});
