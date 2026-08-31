import type { AuthenticatedAdmin } from './authenticated-admin.js';
import type { AuthenticatedUser } from './authenticated-user.js';

export type RequestWithAuth = {
  user?: AuthenticatedUser | null;
  admin?: AuthenticatedAdmin | null;
};
