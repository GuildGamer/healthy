import * as ImagePicker from 'expo-image-picker';
import {
  PHOTO_MISSING_MESSAGE,
  PHOTO_TOO_LARGE_MESSAGE,
  MAX_PROFILE_PHOTO_BASE64_LENGTH,
  pickProfilePhoto,
  profilePhotoFromAsset,
  profilePhotoFromCapture,
  type ProfilePhotoRenderer,
} from './pick-profile-photo';
import { PROFILE_PHOTO_EDGE_PX, renderProfilePhoto } from './render-profile-photo';

jest.mock('./render-profile-photo', () => {
  const actual =
    jest.requireActual<typeof import('./render-profile-photo')>('./render-profile-photo');
  return {
    ...actual,
    renderProfilePhoto: jest.fn(),
  };
});

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

describe('profilePhotoFromCapture', () => {
  const uri = 'file://camera/original.jpg';

  it('saves the first resized jpeg', async () => {
    const render = jest.fn<ReturnType<ProfilePhotoRenderer>, Parameters<ProfilePhotoRenderer>>(
      async () => ({ base64: 'abcd' }),
    );

    await expect(
      profilePhotoFromCapture({ uri, width: 4000, height: 3000 }, render),
    ).resolves.toEqual({
      status: 'picked',
      image: 'data:image/jpeg;base64,abcd',
    });
    expect(render).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledWith({
      uri,
      width: 4000,
      height: 3000,
      edge: PROFILE_PHOTO_EDGE_PX,
      compress: 0.7,
    });
  });

  it('retries smaller when the first avatar is still over the cap', async () => {
    const render = jest
      .fn<ReturnType<ProfilePhotoRenderer>, Parameters<ProfilePhotoRenderer>>()
      .mockResolvedValueOnce({
        base64: 'a'.repeat(MAX_PROFILE_PHOTO_BASE64_LENGTH + 1),
      })
      .mockResolvedValueOnce({ base64: 'small' });

    await expect(
      profilePhotoFromCapture({ uri, width: 800, height: 1200 }, render),
    ).resolves.toEqual({
      status: 'picked',
      image: 'data:image/jpeg;base64,small',
    });
    expect(render).toHaveBeenLastCalledWith({
      uri,
      width: 800,
      height: 1200,
      edge: 256,
      compress: 0.5,
    });
  });

  it('fails when both avatar sizes are still too large', async () => {
    const render = jest.fn<ReturnType<ProfilePhotoRenderer>, Parameters<ProfilePhotoRenderer>>(
      async () => ({
        base64: 'a'.repeat(MAX_PROFILE_PHOTO_BASE64_LENGTH + 1),
      }),
    );

    await expect(profilePhotoFromCapture({ uri }, render)).resolves.toEqual({
      status: 'failed',
      message: PHOTO_TOO_LARGE_MESSAGE,
    });
    expect(render).toHaveBeenCalledTimes(2);
  });

  it('does not retry when the resized file has no bytes', async () => {
    const render = jest.fn<ReturnType<ProfilePhotoRenderer>, Parameters<ProfilePhotoRenderer>>(
      async () => ({}),
    );

    await expect(profilePhotoFromCapture({ uri }, render)).resolves.toEqual({
      status: 'failed',
      message: PHOTO_MISSING_MESSAGE,
    });
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('fails closed when resizing throws', async () => {
    const render = jest.fn<ReturnType<ProfilePhotoRenderer>, Parameters<ProfilePhotoRenderer>>(
      async () => {
        throw new Error('native');
      },
    );

    await expect(profilePhotoFromCapture({ uri }, render)).resolves.toEqual({
      status: 'failed',
      message: PHOTO_MISSING_MESSAGE,
    });
  });

  it('fails closed when the picker kept no file', async () => {
    const render = jest.fn();

    await expect(profilePhotoFromCapture({ uri: '  ' }, render)).resolves.toEqual({
      status: 'failed',
      message: PHOTO_MISSING_MESSAGE,
    });
    expect(render).not.toHaveBeenCalled();
  });
});

describe('pickProfilePhoto', () => {
  const launchLibrary = ImagePicker.launchImageLibraryAsync as unknown as jest.Mock;

  beforeEach(() => {
    launchLibrary.mockReset();
  });

  it('resizes the library file instead of uploading the camera original', async () => {
    launchLibrary.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://library/photo.jpg', width: 3024, height: 4032 }],
    });
    const mockedRender = renderProfilePhoto as jest.MockedFunction<typeof renderProfilePhoto>;
    mockedRender.mockResolvedValue({ base64: 'avatar' });

    await expect(pickProfilePhoto('library')).resolves.toEqual({
      status: 'picked',
      image: 'data:image/jpeg;base64,avatar',
    });
    expect(launchLibrary).toHaveBeenCalledWith(expect.not.objectContaining({ base64: true }));
    expect(mockedRender).toHaveBeenCalledWith(
      expect.objectContaining({
        uri: 'file://library/photo.jpg',
        width: 3024,
        height: 4032,
        edge: PROFILE_PHOTO_EDGE_PX,
      }),
    );
  });
});
