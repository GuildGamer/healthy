import {
  DEFAULT_PHOTO_ASPECT_RATIO,
  MAX_EVIDENCE_PHOTO_BASE64_LENGTH,
  PHOTO_MISSING_MESSAGE,
  PHOTO_TOO_LARGE_MESSAGE,
  photoAspectRatio,
  photoFromCameraTake,
} from './capture-selfie';

jest.mock('./compress-evidence-photo', () => ({
  compressEvidencePhotoForUpload: jest.fn(async () => 'compressed-bytes'),
}));

const { compressEvidencePhotoForUpload } = jest.requireMock('./compress-evidence-photo') as {
  compressEvidencePhotoForUpload: jest.Mock;
};

describe('photoFromCameraTake', () => {
  beforeEach(() => {
    compressEvidencePhotoForUpload.mockReset();
    compressEvidencePhotoForUpload.mockResolvedValue('compressed-bytes');
  });

  it('keeps jpeg bytes, a preview uri, and the sensor size', async () => {
    await expect(
      photoFromCameraTake({
        uri: 'file://shot.jpg',
        base64: 'abcd',
        width: 3024,
        height: 4032,
      }),
    ).resolves.toEqual({
      status: 'captured',
      photo: {
        mimeType: 'image/jpeg',
        imageBase64: 'abcd',
        previewUri: 'file://shot.jpg',
        width: 3024,
        height: 4032,
      },
    });
    expect(compressEvidencePhotoForUpload).not.toHaveBeenCalled();
  });

  it('uses the sensor ratio when both sides are present', () => {
    expect(photoAspectRatio({ width: 4032, height: 3024 })).toBeCloseTo(4 / 3);
    expect(photoAspectRatio({})).toBe(DEFAULT_PHOTO_ASPECT_RATIO);
  });

  it('fails closed when the take has no bytes', async () => {
    await expect(photoFromCameraTake({ uri: 'file://empty.jpg' })).resolves.toEqual({
      status: 'failed',
      message: PHOTO_MISSING_MESSAGE,
    });
  });

  it('recompresses oversized base64 for upload and keeps the sharp preview', async () => {
    await expect(
      photoFromCameraTake({
        uri: 'file://huge.jpg',
        base64: 'a'.repeat(MAX_EVIDENCE_PHOTO_BASE64_LENGTH + 1),
        width: 3024,
        height: 4032,
      }),
    ).resolves.toEqual({
      status: 'captured',
      photo: {
        mimeType: 'image/jpeg',
        imageBase64: 'compressed-bytes',
        previewUri: 'file://huge.jpg',
        width: 3024,
        height: 4032,
      },
    });
    expect(compressEvidencePhotoForUpload).toHaveBeenCalledWith('file://huge.jpg');
  });

  it('rejects when recompress still cannot fit the upload cap', async () => {
    compressEvidencePhotoForUpload.mockResolvedValueOnce(null);

    await expect(
      photoFromCameraTake({
        uri: 'file://huge.jpg',
        base64: 'a'.repeat(MAX_EVIDENCE_PHOTO_BASE64_LENGTH + 1),
      }),
    ).resolves.toEqual({
      status: 'failed',
      message: PHOTO_TOO_LARGE_MESSAGE,
    });
  });
});
