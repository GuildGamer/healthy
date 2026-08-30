import type { CapturedSelfie } from './capture-selfie';
import {
  consumeCaptureResult,
  defaultFacingFor,
  parseCameraIntent,
  setCaptureResult,
} from './capture-session';

const photo: CapturedSelfie = {
  mimeType: 'image/jpeg',
  imageBase64: 'abc',
  previewUri: 'file://gym.jpg',
};

describe('capture session', () => {
  it('parses intent and default facing', () => {
    expect(parseCameraIntent('proof')).toBe('proof');
    expect(parseCameraIntent(undefined)).toBe('selfie');
    expect(defaultFacingFor('selfie')).toBe('front');
    expect(defaultFacingFor('proof')).toBe('back');
  });

  it('hands a photo to the waiting screen once', () => {
    setCaptureResult('c-gym', photo);

    expect(consumeCaptureResult('c-gym')).toEqual(photo);
    expect(consumeCaptureResult('c-gym')).toBeNull();
    expect(consumeCaptureResult('other')).toBeNull();
  });
});
