export const VERIFY_COPY = {
  title: 'Verify a clip',
  lede: 'Enter the code burned into the video. If you copied it, it fills in here. Healthy plays the original if it is still on file.',
  invalidCode: 'That code is not valid. Check each character against the video.',
  requestFailed: 'Could not check the code. Try again.',
  verified: 'Verified',
  expired: 'Original expired',
  removed: 'Removed by owner',
  notShared: 'Not shared yet',
  notSharedBody: 'This clip exists but has not been shared, so it cannot be verified yet.',
  notFound: 'No clip found',
  notFoundBody: 'No Healthy clip has this code. Check it matches the video.',
  checkAnother: 'Check another',
} as const;
