import type { IncomingMessage } from 'node:http';
import { describe, expect, it } from 'vitest';
import { requestPath, shouldSkipRequestLog } from './request-logger.js';

function requestWithUrl(
  url: string,
  originalUrl?: string,
): IncomingMessage {
  return { url, originalUrl } as IncomingMessage & { originalUrl?: string };
}

describe('requestPath', () => {
  it('strips the query string so invite tokens stay out of logs', () => {
    expect(
      requestPath(requestWithUrl('/matches/invite/public?token=abc')),
    ).toBe('/matches/invite/public');
  });

  it('leaves paths without a query alone', () => {
    expect(requestPath(requestWithUrl('/rpc/challenges.list'))).toBe(
      '/rpc/challenges.list',
    );
  });

  it('prefers Express originalUrl when url has been rewritten', () => {
    expect(
      requestPath(
        requestWithUrl(
          '/public?token=abc',
          '/matches/invite/public?token=abc',
        ),
      ),
    ).toBe('/matches/invite/public');
  });

  it('returns an empty string when no url is present', () => {
    expect(requestPath({} as IncomingMessage)).toBe('');
  });
});

describe('shouldSkipRequestLog', () => {
  it('skips livez and readyz health checks', () => {
    expect(shouldSkipRequestLog(requestWithUrl('/livez'))).toBe(true);
    expect(shouldSkipRequestLog(requestWithUrl('/readyz'))).toBe(true);
  });

  it('does not skip product traffic', () => {
    expect(shouldSkipRequestLog(requestWithUrl('/rpc/me.get'))).toBe(false);
    expect(
      shouldSkipRequestLog(requestWithUrl('/readyz/extra')),
    ).toBe(false);
  });
});
