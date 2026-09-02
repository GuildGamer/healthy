import {
  MAX_EVIDENCE_PHOTO_BASE64_LENGTH,
  PHOTO_MISSING_MESSAGE,
  PHOTO_TOO_LARGE_MESSAGE,
  photoFromCameraTake,
} from './capture-selfie';

describe('photoFromCameraTake', () => {
  it('keeps jpeg bytes and a preview uri', () => {
    expect(
      photoFromCameraTake({ uri: 'file://shot.jpg', base64: 'abcd' }),
    ).toEqual({
      status: 'captured',
      photo: {
        mimeType: 'image/jpeg',
        imageBase64: 'abcd',
        previewUri: 'file://shot.jpg',
      },
    });
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
