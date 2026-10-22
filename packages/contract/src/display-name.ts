import { z } from 'zod';

export const DISPLAY_NAME_MIN_LENGTH = 2;
export const DISPLAY_NAME_MAX_LENGTH = 24;

/**
 * The public name on leaderboards and in groups. Shared so sign-up and Profile
 * check exactly what the API enforces.
 */
export const displayNameSchema = z
  .string()
  .trim()
  .min(DISPLAY_NAME_MIN_LENGTH)
  .max(DISPLAY_NAME_MAX_LENGTH)
  .regex(/^[\p{L}\p{N} ._-]+$/u, 'Use letters, numbers, spaces, dots, hyphens or underscores');
