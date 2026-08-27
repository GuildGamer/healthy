import { Injectable } from '@nestjs/common';
import { ORPCError } from '@orpc/server';

export type AuthenticatedUser = {
  id: string;
  email: string;
  name?: string | null;
};

@Injectable()
export class MeService {
  getMe(user: AuthenticatedUser | null | undefined): {
    id: string;
    email: string;
    name: string | null;
  } {
    if (!user) {
      throw new ORPCError('UNAUTHORIZED', {
        message: 'Authentication required',
      });
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
    };
  }
}
