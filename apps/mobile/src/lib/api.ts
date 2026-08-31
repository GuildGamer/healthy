import {
  createApiClient,
  createApiQueryUtils,
  type ApiClient,
} from '@product/client';
import { authClient } from './auth-client';
import { API_BASE_URL } from './config';

export { API_BASE_URL };

export const apiClient: ApiClient = createApiClient({
  baseUrl: API_BASE_URL,
  headers: async (): Promise<Record<string, string>> => {
    const cookie = await authClient.getCookie();
    if (!cookie) {
      return {};
    }

    return { cookie };
  },
});

export const apiQuery = createApiQueryUtils(apiClient);
