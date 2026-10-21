/**
 * Six zeros — a developer machine only, where the code is logged instead of
 * emailed. Staging and production leave this unset so Better Auth generates
 * a random code and the mailbox sends that same code.
 */
export const LOCAL_DEV_OTP = '000000';

export function localDevOtp(isLocal: boolean): string | undefined {
  return isLocal ? LOCAL_DEV_OTP : undefined;
}
