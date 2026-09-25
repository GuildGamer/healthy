import type {
  JWSRenewalInfoDecodedPayload,
  JWSTransactionDecodedPayload,
  ResponseBodyV2DecodedPayload,
} from '@apple/app-store-server-library';

export type AppleSignedDataVerifier = {
  verifyTransaction(
    signedTransactionInfo: string,
  ): Promise<JWSTransactionDecodedPayload>;
  verifyNotification(
    signedPayload: string,
  ): Promise<ResponseBodyV2DecodedPayload>;
  verifyRenewalInfo(
    signedRenewalInfo: string,
  ): Promise<JWSRenewalInfoDecodedPayload>;
};
