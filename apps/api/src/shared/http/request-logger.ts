import type { IncomingMessage } from 'node:http';
import morgan from 'morgan';

const HEALTH_CHECK_PATHS = new Set(['/livez', '/readyz']);

type RequestWithOriginalUrl = IncomingMessage & {
  originalUrl?: string;
};

/**
 * Prefer Express `originalUrl` so Nest route mounting cannot rewrite the
 * logged path. Fall back to `url` for plain Node requests in tests.
 */
function rawRequestUrl(request: IncomingMessage): string {
  const withOriginal = request as RequestWithOriginalUrl;
  return withOriginal.originalUrl ?? request.url ?? '';
}

/** Query strings carry invite tokens and proof codes; log the path only. */
export function requestPath(request: IncomingMessage): string {
  const url = rawRequestUrl(request);
  const queryStart = url.indexOf('?');
  return queryStart === -1 ? url : url.slice(0, queryStart);
}

export function shouldSkipRequestLog(request: IncomingMessage): boolean {
  return HEALTH_CHECK_PATHS.has(requestPath(request));
}

morgan.token('path', requestPath);

export const requestLogger = morgan(
  ':method :path :status :res[content-length] - :response-time ms',
  { skip: shouldSkipRequestLog },
);
