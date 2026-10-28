import { PROOF_CLIP_DEFAULT_ENCODING } from '@product/contract/proof-clip-limits';
import { resolveProofClipEncoding } from './proof-clip-encoding';

describe('resolveProofClipEncoding', () => {
  it('keeps a valid server profile', () => {
    const encoding = {
      bitRate: 800_000,
      frameRate: 20,
      width: 640,
      height: 1136,
    };

    expect(resolveProofClipEncoding(encoding)).toEqual(encoding);
  });

  it('falls back when the server omits encoding', () => {
    expect(resolveProofClipEncoding(undefined)).toEqual(PROOF_CLIP_DEFAULT_ENCODING);
    expect(resolveProofClipEncoding(null)).toEqual(PROOF_CLIP_DEFAULT_ENCODING);
  });

  it('falls back when a dimension is odd', () => {
    expect(
      resolveProofClipEncoding({
        bitRate: 1_500_000,
        frameRate: 24,
        width: 721,
        height: 1280,
      }),
    ).toEqual(PROOF_CLIP_DEFAULT_ENCODING);
  });

  it('falls back when the bitrate is out of range', () => {
    expect(
      resolveProofClipEncoding({
        bitRate: 100_000,
        frameRate: 24,
        width: 720,
        height: 1280,
      }),
    ).toEqual(PROOF_CLIP_DEFAULT_ENCODING);
  });
});
