import {
  DEFAULT_PHOTO_ASPECT_RATIO,
  MAX_EVIDENCE_PHOTO_BASE64_LENGTH,
  PHOTO_MISSING_MESSAGE,
  PHOTO_TOO_LARGE_MESSAGE,
  photoAspectRatio,
  photoFromCameraTake,
} from './capture-selfie';

describe('photoFromCameraTake', () => {
  it('keeps jpeg bytes, a preview uri, and the sensor size', () => {
    expect(
      photoFromCameraTake({
        uri: 'file://shot.jpg',
        base64: 'abcd',
        width: 3024,
        height: 4032,
      }),
    ).toEqual({
      status: 'captured',
      photo: {
        mimeType: 'image/jpeg',
        imageBase64: 'abcd',
        previewUri: 'file://shot.jpg',
        width: 3024,
        height: 4032,
      },
    });
  });

  it('uses the sensor ratio when both sides are present', () => {
    expect(photoAspectRatio({ width: 4032, height: 3024 })).toBeCloseTo(4 / 3);
    expect(photoAspectRatio({})).toBe(DEFAULT_PHOTO_ASPECT_RATIO);
  });

  it('fails closed when the take has no bytes', () => {
    expect(photoFromCameraTake({ uri: 'file://empty.jpg' })).toEqual({
      status: 'failed',
      message: PHOTO_MISSING_MESSAGE,
    });
  });

  it('rejects oversized base64 before upload', () => {
    expect(
      photoFromCameraTake({
        uri: 'file://huge.jpg',
        base64: 'a'.repeat(MAX_EVIDENCE_PHOTO_BASE64_LENGTH + 1),
      }),
    ).toEqual({
      status: 'failed',
      message: PHOTO_TOO_LARGE_MESSAGE,
    });
  });
});
