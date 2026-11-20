import { createHash, createHmac } from 'node:crypto';
import type { S3StorageConfig } from '../config/environment.js';
import type { ObjectHead, ObjectStorage, PresignedPut } from './object-storage.js';

/**
 * One adapter for Cloudflare R2, Backblaze B2, and MinIO. Uses raw SigV4 so we
 * do not pull the AWS SDK into the API process. Provider types stay here.
 */
export function createS3CompatibleObjectStorage(config: S3StorageConfig): ObjectStorage {
  return {
    async presignPut(input): Promise<PresignedPut> {
      const headers: Record<string, string> = {
        'Content-Type': input.contentType,
      };
      if (input.checksumSha256Base64) {
        headers['x-amz-checksum-sha256'] = input.checksumSha256Base64;
      }

      const url = await signUrl({
        config,
        method: 'PUT',
        key: input.key,
        expiresInSeconds: 15 * 60,
        headers,
        unsignedPayload: true,
      });

      return { url, headers };
    },

    async presignGet(key, ttlSeconds): Promise<string> {
      return signUrl({
        config,
        method: 'GET',
        key,
        expiresInSeconds: ttlSeconds,
        headers: {},
        unsignedPayload: true,
      });
    },

    async head(key): Promise<ObjectHead | null> {
      const url = await signUrl({
        config,
        method: 'HEAD',
        key,
        expiresInSeconds: 60,
        headers: {},
        unsignedPayload: true,
      });

      const response = await fetch(url, { method: 'HEAD' });
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        throw new Error(`Object head failed with status ${response.status}`);
      }

      const byteSize = Number(response.headers.get('content-length') ?? '0');
      return {
        byteSize: Number.isFinite(byteSize) ? byteSize : 0,
        contentType: response.headers.get('content-type'),
        checksumSha256Base64: response.headers.get('x-amz-checksum-sha256'),
      };
    },

    async delete(key): Promise<void> {
      const url = await signUrl({
        config,
        method: 'DELETE',
        key,
        expiresInSeconds: 60,
        headers: {},
        unsignedPayload: true,
      });

      const response = await fetch(url, { method: 'DELETE' });
      if (response.status === 404 || response.ok || response.status === 204) {
        return;
      }
      throw new Error(`Object delete failed with status ${response.status}`);
    },
  };
}

async function signUrl(input: {
  config: S3StorageConfig;
  method: string;
  key: string;
  expiresInSeconds: number;
  headers: Record<string, string>;
  unsignedPayload: boolean;
}): Promise<string> {
  const { config } = input;
  const endpoint = new URL(config.endpoint);
  const encodedKey = encodeS3Key(input.key);
  const host = endpoint.host;
  const path = config.forcePathStyle
    ? `${endpoint.pathname.replace(/\/$/, '')}/${config.bucket}/${encodedKey}`
    : `${endpoint.pathname.replace(/\/$/, '')}/${encodedKey}`;

  const amzDate = toAmzDate(new Date());
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;

  const signedHeaderNames = ['host', ...Object.keys(input.headers).map((h) => h.toLowerCase())]
    .sort()
    .filter((name, index, all) => all.indexOf(name) === index);
  const signedHeaders = signedHeaderNames.join(';');

  const query: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${config.accessKeyId}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(input.expiresInSeconds),
    'X-Amz-SignedHeaders': signedHeaders,
  };

  const canonicalQuery = Object.keys(query)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(query[key]!)}`)
    .join('&');

  const canonicalHeaders = `${signedHeaderNames
    .map((name) => {
      if (name === 'host') {
        return `host:${host}\n`;
      }
      const value = Object.entries(input.headers).find(
        ([headerName]) => headerName.toLowerCase() === name,
      )?.[1];
      return `${name}:${(value ?? '').trim()}\n`;
    })
    .join('')}`;

  const payloadHash = input.unsignedPayload ? 'UNSIGNED-PAYLOAD' : emptyHash();
  const canonicalRequest = [
    input.method,
    path.startsWith('/') ? path : `/${path}`,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const signingKey = getSignatureKey(
    config.secretAccessKey,
    dateStamp,
    config.region,
    's3',
  );
  const signature = hmacHex(signingKey, stringToSign);

  const origin = `${endpoint.protocol}//${host}`;
  const pathname = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${pathname}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

function encodeS3Key(key: string): string {
  return key
    .split('/')
    .map((segment) => encodeURIComponent(segment).replace(/[!'()*]/g, escapeChar))
    .join('/');
}

function escapeChar(char: string): string {
  return `%${char.charCodeAt(0).toString(16).toUpperCase()}`;
}

function toAmzDate(date: Date): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function emptyHash(): string {
  return sha256Hex('');
}

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac('sha256', key).update(value, 'utf8').digest();
}

function hmacHex(key: Buffer, value: string): string {
  return createHmac('sha256', key).update(value, 'utf8').digest('hex');
}

function getSignatureKey(
  secret: string,
  dateStamp: string,
  region: string,
  service: string,
): Buffer {
  const kDate = hmac(`AWS4${secret}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, 'aws4_request');
}
