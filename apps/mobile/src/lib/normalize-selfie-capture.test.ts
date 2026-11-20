import { FlipType, ImageManipulator } from 'expo-image-manipulator';
import {
  PHOTO_MISSING_MESSAGE,
  PHOTO_TOO_LARGE_MESSAGE,
  MAX_EVIDENCE_PHOTO_BASE64_LENGTH,
} from './capture-selfie';
import {
  degreesFromExifOrientation,
  normalizeSelfieCapture,
  shouldNormalizeCameraTake,
  uprightSize,
} from './normalize-selfie-capture';

function mockManipulatorContext(saved: {
  uri: string;
  base64: string;
  width?: number;
  height?: number;
}) {
  const context: {
    rotate: jest.Mock;
    flip: jest.Mock;
    renderAsync: jest.Mock;
    release: jest.Mock;
  } = {
    rotate: jest.fn(),
    flip: jest.fn(),
    renderAsync: jest.fn(async () => ({
      saveAsync: jest.fn(async () => saved),
      release: jest.fn(),
    })),
    release: jest.fn(),
  };
  context.rotate.mockReturnValue(context);
  context.flip.mockReturnValue(context);
  (ImageManipulator.manipulate as jest.Mock).mockReturnValueOnce(context);
  return context;
}

describe('degreesFromExifOrientation', () => {
  it('maps EXIF orientation tags to clockwise degrees', () => {
    expect(degreesFromExifOrientation(1)).toBe(0);
    expect(degreesFromExifOrientation(3)).toBe(180);
    expect(degreesFromExifOrientation(6)).toBe(90);
    expect(degreesFromExifOrientation(8)).toBe(270);
    expect(degreesFromExifOrientation('6')).toBe(90);
    expect(degreesFromExifOrientation(undefined)).toBe(0);
  });
});

describe('shouldNormalizeCameraTake', () => {
  it('always normalizes front-camera takes so the selfie can be mirrored', () => {
    expect(shouldNormalizeCameraTake({ facing: 'front' })).toBe(true);
  });

  it('only normalizes back-camera takes when EXIF still needs baking', () => {
    expect(shouldNormalizeCameraTake({ facing: 'back' })).toBe(false);
    expect(shouldNormalizeCameraTake({ facing: 'back', exif: { Orientation: 1 } })).toBe(false);
    expect(shouldNormalizeCameraTake({ facing: 'back', exif: { Orientation: 6 } })).toBe(true);
  });
});

describe('uprightSize', () => {
  it('swaps sides after a quarter turn', () => {
    expect(uprightSize(4032, 3024, 90)).toEqual({ width: 3024, height: 4032 });
    expect(uprightSize(4032, 3024, 180)).toEqual({ width: 4032, height: 3024 });
  });
});

describe('normalizeSelfieCapture', () => {
  const take = {
    uri: 'file://shot.jpg',
    base64: 'raw-bytes',
    width: 3024,
    height: 4032,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes a back-camera take through when orientation is already upright', async () => {
    await expect(normalizeSelfieCapture(take, { facing: 'back' })).resolves.toEqual({
      status: 'captured',
      photo: {
        mimeType: 'image/jpeg',
        imageBase64: 'raw-bytes',
        previewUri: 'file://shot.jpg',
        width: 3024,
        height: 4032,
      },
    });
    expect(ImageManipulator.manipulate).not.toHaveBeenCalled();
  });

  it('mirrors a front selfie after capture so it matches the live preview', async () => {
    const context = mockManipulatorContext({
      uri: 'file://shot-mirrored.jpg',
      base64: 'mirrored-bytes',
    });

    await expect(normalizeSelfieCapture(take, { facing: 'front' })).resolves.toEqual({
      status: 'captured',
      photo: {
        mimeType: 'image/jpeg',
        imageBase64: 'mirrored-bytes',
        previewUri: 'file://shot-mirrored.jpg',
        width: 3024,
        height: 4032,
      },
    });

    expect(ImageManipulator.manipulate).toHaveBeenCalledWith('file://shot.jpg');
    expect(context.rotate).not.toHaveBeenCalled();
    expect(context.flip).toHaveBeenCalledWith(FlipType.Horizontal);
  });

  it('bakes EXIF orientation then mirrors a front selfie', async () => {
    const context = mockManipulatorContext({
      uri: 'file://shot-fixed.jpg',
      base64: 'fixed-bytes',
    });

    await expect(
      normalizeSelfieCapture(
        { ...take, width: 4032, height: 3024, exif: { Orientation: 6 } },
        { facing: 'front' },
      ),
    ).resolves.toEqual({
      status: 'captured',
      photo: {
        mimeType: 'image/jpeg',
        imageBase64: 'fixed-bytes',
        previewUri: 'file://shot-fixed.jpg',
        width: 3024,
        height: 4032,
      },
    });

    expect(context.rotate).toHaveBeenCalledWith(90);
    expect(context.flip).toHaveBeenCalledWith(FlipType.Horizontal);
  });

  it('fails closed when the manipulator cannot keep the photo', async () => {
    (ImageManipulator.manipulate as jest.Mock).mockReturnValueOnce({
      flip: jest.fn(() => {
        throw new Error('native');
      }),
      release: jest.fn(),
    });

    await expect(normalizeSelfieCapture(take, { facing: 'front' })).resolves.toEqual({
      status: 'failed',
      message: PHOTO_MISSING_MESSAGE,
    });
  });

  it('still rejects oversized base64 after normalize', async () => {
    mockManipulatorContext({
      uri: 'file://huge.jpg',
      base64: 'a'.repeat(MAX_EVIDENCE_PHOTO_BASE64_LENGTH + 1),
    });

    await expect(normalizeSelfieCapture(take, { facing: 'front' })).resolves.toEqual({
      status: 'failed',
      message: PHOTO_TOO_LARGE_MESSAGE,
    });
  });
});
