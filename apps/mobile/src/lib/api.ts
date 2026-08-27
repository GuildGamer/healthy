import {
  createApiClient,
  createApiQueryUtils,
  type ApiClient,
} from '@product/client';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export const apiClient: ApiClient = createApiClient({
  baseUrl: API_BASE_URL,
});

export const apiQuery = createApiQueryUtils(apiClient);
