import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { ENVIRONMENT } from '../config/config.tokens.js';
import type { Environment } from '../config/environment.js';

export const INTERNAL_SECRET_HEADER = 'x-internal-secret';

function matchesSecret(presented: string, expected: string): boolean {
  const presentedBytes = Buffer.from(presented);
  const expectedBytes = Buffer.from(expected);

  // timingSafeEqual throws on a length mismatch, which would itself leak the
  // secret's length, so compare that separately and in constant order.
  if (presentedBytes.length !== expectedBytes.length) {
    return false;
  }

  return timingSafeEqual(presentedBytes, expectedBytes);
}

/**
 * Guards machine-to-machine routes with a shared secret rather than a user
 * session. Fails closed: with no secret configured the route is unreachable.
 */
@Injectable()
export class InternalSecretGuard implements CanActivate {
  constructor(@Inject(ENVIRONMENT) private readonly environment: Environment) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.environment.reminderDispatchSecret;

    if (!expected) {
      throw new UnauthorizedException('Internal endpoint is not configured');
    }

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();

    const presented = request.headers[INTERNAL_SECRET_HEADER];

    if (typeof presented !== 'string' || !matchesSecret(presented, expected)) {
      throw new UnauthorizedException('Invalid internal secret');
    }

    return true;
  }
}
