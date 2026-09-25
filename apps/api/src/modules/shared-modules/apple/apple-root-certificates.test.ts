import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadAppleRootCertificates } from './apple-root-certificates.js';

describe('loadAppleRootCertificates', () => {
  it('loads DER .cer files from the API certs directory', () => {
    const certificates = loadAppleRootCertificates();

    expect(certificates.length).toBeGreaterThanOrEqual(3);
    expect(certificates.every((certificate) => certificate.length > 0)).toBe(
      true,
    );
  });

  it('prefers the first directory that has .cer files', () => {
    const directory = mkdtempSync(join(tmpdir(), 'apple-certs-'));
    writeFileSync(join(directory, 'TestRoot.cer'), Buffer.from('der-bytes'));

    const certificates = loadAppleRootCertificates([directory]);

    expect(certificates).toHaveLength(1);
    expect(certificates[0]?.toString()).toBe('der-bytes');
  });
});
