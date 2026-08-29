/** Six zeros — local and development only. Production generates a random code. */
export const LOCAL_DEV_OTP = '000000';

export function localDevOtp(isLocal: boolean): string | undefined {
  return isLocal ? LOCAL_DEV_OTP : undefined;
}
