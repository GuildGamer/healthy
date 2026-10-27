export const VERIFY_COPY = {
  title: 'Verify a clip',
  lede: 'Enter the code burned into the video. If you copied it, it fills in here. Healthy plays the original if it is still on file.',
  invalidCode: 'That code is not valid. Check each character against the video.',
  requestFailed: 'Could not check the code. Try again.',
  verified: 'Verified',
  expired: 'Original expired',
  removed: 'Removed by owner',
  private: 'Kept private',
  privateBody: 'This is a real Healthy clip, but its owner keeps it to themselves.',
  notUploaded: 'Almost there',
  notUploadedBody:
    'This clip’s code is real but it hasn’t reached Healthy yet. Try again in a minute.',
  notFound: 'No clip found',
  notFoundBody: 'No Healthy clip has this code. Check it matches the video.',
  checkAnother: 'Check another',
} as const;
