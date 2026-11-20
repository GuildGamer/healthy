import { describe, expect, it } from 'vitest';
import {
  audienceFromVisibility,
  resolveProofClipUploadIntent,
} from './proof-clips.js';

describe('audienceFromVisibility', () => {
  it('maps shared to anyone and group to a board post', () => {
    expect(audienceFromVisibility('shared')).toEqual({
      audience: 'anyone',
      postToGroup: false,
    });
    expect(audienceFromVisibility('group')).toEqual({
      audience: 'only_me',
      postToGroup: true,
    });
  });
});

describe('resolveProofClipUploadIntent', () => {
  it('prefers audience and postToGroup when present', () => {
    expect(
      resolveProofClipUploadIntent({
        audience: 'anyone',
        postToGroup: true,
        visibility: 'shared',
      }),
    ).toEqual({ audience: 'anyone', postToGroup: true });
  });

  it('fills from legacy visibility when audience is absent', () => {
    expect(resolveProofClipUploadIntent({ visibility: 'group' })).toEqual({
      audience: 'only_me',
      postToGroup: true,
    });
  });

  it('defaults to anyone when nothing is set', () => {
    expect(resolveProofClipUploadIntent({})).toEqual({
      audience: 'anyone',
      postToGroup: false,
    });
  });
});
