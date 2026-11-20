import type { StorageConfig } from '../config/environment.js';
import { createDisabledObjectStorage } from './disabled-storage.js';
import { createS3CompatibleObjectStorage } from './s3-compatible-storage.js';

export type PresignedPut = {
  url: string;
  headers: Record<string, string>;
};

export type ObjectHead = {
  byteSize: number;
  contentType: string | null;
  checksumSha256Base64: string | null;
};

export type ObjectStorage = {
  presignPut(input: {
    key: string;
    contentType: string;
    byteSize: number;
    /** Raw SHA-256 digest, base64-encoded, when the store enforces it. */
    checksumSha256Base64?: string;
  }): Promise<PresignedPut>;
  presignGet(key: string, ttlSeconds: number): Promise<string>;
  head(key: string): Promise<ObjectHead | null>;
  delete(key: string): Promise<void>;
};

export function createObjectStorage(config: StorageConfig): ObjectStorage {
  switch (config.mode) {
    case 'disabled':
      return createDisabledObjectStorage();
    case 's3':
      return createS3CompatibleObjectStorage(config);
    default: {
      const unexpected: never = config;
      throw new Error(`Unsupported storage provider: ${String(unexpected)}`);
    }
  }
}
