import { createORPCClient } from '@orpc/client';
import type { ContractRouterClient } from '@orpc/contract';
import type { JsonifiedClient } from '@orpc/openapi-client';
import { OpenAPILink } from '@orpc/openapi-client/fetch';
import { appContract, type AppContract } from '@product/contract';

export type ApiClient = JsonifiedClient<ContractRouterClient<AppContract>>;

export type CreateApiClientOptions = {
  baseUrl: string;
  headers?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>);
  fetch?: typeof globalThis.fetch;
};

export function createApiClient(options: CreateApiClientOptions): ApiClient {
  const link = new OpenAPILink(appContract, {
    url: options.baseUrl,
    headers: options.headers,
    fetch: options.fetch,
  });

  return createORPCClient(link);
}

export { appContract };
export type { AppContract, HealthOutput, MeOutput } from '@product/contract';
