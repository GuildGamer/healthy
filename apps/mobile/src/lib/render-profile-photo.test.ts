import { avatarResize, PROFILE_PHOTO_EDGE_PX } from './render-profile-photo';

describe('avatarResize', () => {
  it('caps the width of a landscape photo', () => {
    expect(avatarResize(4032, 3024, PROFILE_PHOTO_EDGE_PX)).toEqual({
      width: PROFILE_PHOTO_EDGE_PX,
    });
  });

  it('caps the height of a portrait photo', () => {
    expect(avatarResize(3024, 4032, PROFILE_PHOTO_EDGE_PX)).toEqual({
      height: PROFILE_PHOTO_EDGE_PX,
    });
  });

  it('caps the width when the picker did not report a size', () => {
    expect(avatarResize(undefined, undefined, PROFILE_PHOTO_EDGE_PX)).toEqual({
      width: PROFILE_PHOTO_EDGE_PX,
    });
  });
});
