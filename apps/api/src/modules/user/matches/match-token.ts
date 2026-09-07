import { randomBytes } from 'node:crypto';
import { MATCH_INVITE_TOKEN_BYTES } from './constants/match.js';

export function createInviteToken(): string {
  return randomBytes(MATCH_INVITE_TOKEN_BYTES).toString('base64url');
}
