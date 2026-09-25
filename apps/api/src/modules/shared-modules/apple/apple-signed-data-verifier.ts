import {
  Environment,
  SignedDataVerifier,
  VerificationException,
  VerificationStatus,
  type JWSRenewalInfoDecodedPayload,
  type JWSTransactionDecodedPayload,
  type ResponseBodyV2DecodedPayload,
} from '@apple/app-store-server-library';
import type { AppleIapConfig } from '../config/environment.js';
import { loadAppleRootCertificates } from './apple-root-certificates.js';
import type { AppleSignedDataVerifier } from './types/apple-signed-data.js';

export function createAppleSignedDataVerifier(
  appleIap: AppleIapConfig,
): AppleSignedDataVerifier | null {
  if (appleIap.mode === 'disabled') {
    return null;
  }

  const certificates = loadAppleRootCertificates();
  const primary = new SignedDataVerifier(
    certificates,
    true,
    appleIap.environment === 'Production'
      ? Environment.PRODUCTION
      : Environment.SANDBOX,
    appleIap.bundleId,
    appleIap.appAppleId ?? undefined,
  );

  const sandboxFallback =
    appleIap.environment === 'Production'
      ? new SignedDataVerifier(
          certificates,
          true,
          Environment.SANDBOX,
          appleIap.bundleId,
        )
      : null;

  return new FallbackAppleSignedDataVerifier(primary, sandboxFallback);
}

class FallbackAppleSignedDataVerifier implements AppleSignedDataVerifier {
  constructor(
    private readonly primary: SignedDataVerifier,
    private readonly sandboxFallback: SignedDataVerifier | null,
  ) {}

  verifyTransaction(
    signedTransactionInfo: string,
  ): Promise<JWSTransactionDecodedPayload> {
    return this.withSandboxFallback((verifier) =>
      verifier.verifyAndDecodeTransaction(signedTransactionInfo),
    );
  }

  verifyNotification(
    signedPayload: string,
  ): Promise<ResponseBodyV2DecodedPayload> {
    return this.withSandboxFallback((verifier) =>
      verifier.verifyAndDecodeNotification(signedPayload),
    );
  }

  verifyRenewalInfo(
    signedRenewalInfo: string,
  ): Promise<JWSRenewalInfoDecodedPayload> {
    return this.withSandboxFallback((verifier) =>
      verifier.verifyAndDecodeRenewalInfo(signedRenewalInfo),
    );
  }

  private async withSandboxFallback<T>(
    verify: (verifier: SignedDataVerifier) => Promise<T>,
  ): Promise<T> {
    try {
      return await verify(this.primary);
    } catch (error) {
      if (!this.sandboxFallback || !isInvalidEnvironment(error)) {
        throw error;
      }

      return verify(this.sandboxFallback);
    }
  }
}

function isInvalidEnvironment(error: unknown): boolean {
  return (
    error instanceof VerificationException &&
    error.status === VerificationStatus.INVALID_ENVIRONMENT
  );
}
