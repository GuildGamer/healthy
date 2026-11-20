import type { ObjectStorage } from './object-storage.js';

const MESSAGE =
  'Object storage is not configured. Set STORAGE_PROVIDER and credentials, or start MinIO locally.';

/**
 * Local boot path when no bucket is configured. Calls fail closed with a clear
 * message rather than silently writing nowhere.
 */
export function createDisabledObjectStorage(): ObjectStorage {
  return {
    async presignPut() {
      throw new Error(MESSAGE);
    },
    async presignGet() {
      throw new Error(MESSAGE);
    },
    async head() {
      throw new Error(MESSAGE);
    },
    async delete() {
      throw new Error(MESSAGE);
    },
  };
}
