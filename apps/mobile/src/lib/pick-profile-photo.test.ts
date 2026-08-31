import {
  PHOTO_MISSING_MESSAGE,
  PHOTO_TOO_LARGE_MESSAGE,
  MAX_PROFILE_PHOTO_BASE64_LENGTH,
  profilePhotoFromAsset,
} from './pick-profile-photo';

describe('profilePhotoFromAsset', () => {
  it('builds a jpeg data url', () => {
    expect(
      profilePhotoFromAsset({
        base64: 'abcd',
        mimeType: 'image/jpeg',
      }),
    ).toEqual({
      status: 'picked',
      image: 'data:image/jpeg;base64,abcd',
    });
  });

  it('keeps png when the library returns it', () => {
    expect(
      profilePhotoFromAsset({
        base64: 'abcd',
        mimeType: 'image/png',
      }),
    ).toEqual({
      status: 'picked',
      image: 'data:image/png;base64,abcd',
    });
  });

  it('fails closed when the take has no bytes', () => {
    expect(profilePhotoFromAsset({ mimeType: 'image/jpeg' })).toEqual({
      status: 'failed',
      message: PHOTO_MISSING_MESSAGE,
    });
  });

  it('rejects a photo that will not fit on the user row', () => {
    expect(
      profilePhotoFromAsset({
        base64: 'a'.repeat(MAX_PROFILE_PHOTO_BASE64_LENGTH + 1),
        mimeType: 'image/jpeg',
      }),
    ).toEqual({
      status: 'failed',
      message: PHOTO_TOO_LARGE_MESSAGE,
    });
  });
});
