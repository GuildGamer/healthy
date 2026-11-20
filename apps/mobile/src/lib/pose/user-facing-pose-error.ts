/** Hide raw native internals from the camera HUD. */
export function userFacingPoseError(message: string): string {
  if (
    message.includes('NativeState') ||
    message.includes('HybridObject') ||
    message.includes('QuickPose')
  ) {
    return 'Pose tracking hit a native error. Close and reopen this session.';
  }

  if (message.length > 0 && message.length <= 120) {
    return message;
  }

  if (message.length > 120) {
    return `${message.slice(0, 100).trim()}…`;
  }

  return 'Pose tracking paused briefly.';
}
