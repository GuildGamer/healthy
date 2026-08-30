import { PHOTO_MISSING_MESSAGE, photoFromCameraTake } from './capture-selfie';

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
});
