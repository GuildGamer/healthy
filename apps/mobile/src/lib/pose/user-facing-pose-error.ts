/** Hide native Nitro/TFLite internals from the camera HUD. */
export function userFacingPoseError(message: string): string {
  if (
    message.includes('NativeState') ||
    message.includes('HybridTflite') ||
    message.includes('HybridObject') ||
    message.includes('TfliteModel')
  ) {
    return 'Pose tracking hit a native error. Close and reopen this session.';
  }

  if (
    message.includes('110592 bytes') ||
    message.includes('196608 bytes') ||
    message.includes('MoveNet input must be')
  ) {
    return 'Camera frame could not be prepared for pose detection.';
  }

  if (
    message.includes('Rotation') ||
    message.includes('rotate') ||
    message.includes('Invalid PixelFormat')
  ) {
    return 'Camera frame orientation failed. Try again.';
  }

  if (message.length > 0 && message.length <= 120) {
    return message;
  }

  if (message.length > 120) {
    return `${message.slice(0, 100).trim()}…`;
  }

  return 'Pose tracking paused briefly.';
}
