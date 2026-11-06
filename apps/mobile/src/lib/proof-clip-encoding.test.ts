import { PROOF_CLIP_DEFAULT_ENCODING } from '@product/contract/proof-clip-limits';
import { resolveProofClipEncoding } from './proof-clip-encoding';

describe('resolveProofClipEncoding', () => {
  it('keeps a valid server profile', () => {
    const encoding = {
      bitRate: 8_000_000,
      frameRate: 30,
      width: 1080,
      height: 1920,
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
        bitRate: 8_000_000,
        frameRate: 30,
        width: 1081,
        height: 1920,
      }),
    ).toEqual(PROOF_CLIP_DEFAULT_ENCODING);
  });

  it('falls back when the bitrate is invalid', () => {
    expect(
      resolveProofClipEncoding({
        bitRate: 0,
        frameRate: 30,
        width: 1080,
        height: 1920,
      }),
    ).toEqual(PROOF_CLIP_DEFAULT_ENCODING);
  });
});
