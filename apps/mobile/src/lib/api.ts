import { createApiClient, createApiQueryUtils, type ApiClient } from '@product/client';
import { authClient } from './auth-client';
import { API_BASE_URL } from './config';

export { API_BASE_URL };

/** Weak signal must not leave the save spinner spinning forever. */
const REQUEST_TIMEOUT_MS = 15_000;

function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const upstream = init?.signal;
  if (upstream) {
    if (upstream.aborted) {
      controller.abort();
    } else {
      upstream.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  return fetch(input, { ...init, signal: controller.signal }).finally(() => {
    clearTimeout(timeout);
  });
}

export const apiClient: ApiClient = createApiClient({
  baseUrl: API_BASE_URL,
  fetch: fetchWithTimeout,
  headers: async (): Promise<Record<string, string>> => {
    const cookie = await authClient.getCookie();
    if (!cookie) {
      return {};
    }

    return { cookie };
  },
});

export const apiQuery = createApiQueryUtils(apiClient);
