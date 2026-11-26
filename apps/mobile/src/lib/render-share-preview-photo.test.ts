import { ImageManipulator } from 'expo-image-manipulator';
import {
  renderSharePreviewPhoto,
  SHARE_PREVIEW_MAX_EDGE_PX,
} from './render-share-preview-photo';

describe('renderSharePreviewPhoto', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps a photo that is already small enough', async () => {
    await expect(
      renderSharePreviewPhoto('file://gym.jpg', { width: 800, height: 1000 }),
    ).resolves.toBe('file://gym.jpg');
    expect(ImageManipulator.manipulate).not.toHaveBeenCalled();
  });

  it('resizes a tall camera take so the long edge is the preview max', async () => {
    await expect(
      renderSharePreviewPhoto('file://gym.jpg', { width: 3024, height: 4032 }),
    ).resolves.toBe('file://gym.jpg?normalized');

    expect(ImageManipulator.manipulate).toHaveBeenCalledWith('file://gym.jpg');
    const context = jest.mocked(ImageManipulator.manipulate).mock.results[0]?.value as {
      resize: jest.Mock;
    };
    expect(context.resize).toHaveBeenCalledWith({ height: SHARE_PREVIEW_MAX_EDGE_PX });
  });

  it('falls back to a width resize when the size is unknown', async () => {
    await renderSharePreviewPhoto('file://gym.jpg');

    const context = jest.mocked(ImageManipulator.manipulate).mock.results[0]?.value as {
      resize: jest.Mock;
    };
    expect(context.resize).toHaveBeenCalledWith({ width: SHARE_PREVIEW_MAX_EDGE_PX });
  });
});
