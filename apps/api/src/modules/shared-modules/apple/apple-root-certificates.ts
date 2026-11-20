import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CERT_EXTENSION = '.cer';

export function appleRootCertificateDirectories(): string[] {
  const here = dirname(fileURLToPath(import.meta.url));

  return [
    join(process.cwd(), 'certs/apple'),
    join(process.cwd(), 'apps/api/certs/apple'),
    join(here, '../../../../certs/apple'),
  ];
}

export function loadAppleRootCertificates(
  directories: string[] = appleRootCertificateDirectories(),
): Buffer[] {
  for (const directory of directories) {
    const certificates = readDerCertificates(directory);
    if (certificates.length > 0) {
      return certificates;
    }
  }

  throw new Error(
    'Apple Root CA certificates were not found. Expected DER .cer files in certs/apple',
  );
}

function readDerCertificates(directory: string): Buffer[] {
  let names: string[];
  try {
    names = readdirSync(directory);
  } catch {
    return [];
  }

  return names
    .filter((name) => name.endsWith(CERT_EXTENSION))
    .sort()
    .map((name) => readFileSync(join(directory, name)));
}
