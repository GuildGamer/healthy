import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Optional, Public } from '@thallesp/nestjs-better-auth';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from './auth.js';

/**
 * Global guard: routes are protected by default.
 * Use @Public() to open a route.
 * Use @Optional() when auth is optional.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(Public, [
      context.getHandler(),
      context.getClass(),
    ]);

    const isOptional = this.reflector.getAllAndOverride<boolean>(Optional, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      user?: unknown;
      session?: unknown;
    }>();

    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });

    if (session) {
      request.user = session.user;
      request.session = session.session;
      return true;
    }

    if (isPublic || isOptional) {
      return true;
    }

    throw new UnauthorizedException('Authentication required');
  }
}
