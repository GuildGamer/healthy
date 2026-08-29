import type { AuthenticatedUser } from './authenticated-user.js';

export type RequestWithAuth = {
  user?: AuthenticatedUser | null;
};
