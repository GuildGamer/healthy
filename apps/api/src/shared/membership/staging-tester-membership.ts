/**
 * Staging-only free membership for admin-managed tester emails.
 * Never honored outside NODE_ENV=staging.
 */

export function isStagingEnvironment(
  source: NodeJS.ProcessEnv = process.env,
): boolean {
  return source.NODE_ENV?.trim() === 'staging';
}

export function normalizeStagingTesterEmail(email: string): string {
  return email.trim().toLowerCase();
}
