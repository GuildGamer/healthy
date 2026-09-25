import { Module } from '@nestjs/common';
import { ENVIRONMENT } from '../config/config.tokens.js';
import type { Environment } from '../config/environment.js';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module.js';
import { ApplePurchaseService } from './apple-purchase.service.js';
import { createAppleSignedDataVerifier } from './apple-signed-data-verifier.js';
import { AppleWebhookController } from './apple-webhook.controller.js';
import { AppleWebhookService } from './apple-webhook.service.js';
import { APPLE_SIGNED_DATA_VERIFIER } from './apple.tokens.js';

@Module({
  imports: [SubscriptionsModule],
  controllers: [AppleWebhookController],
  providers: [
    {
      provide: APPLE_SIGNED_DATA_VERIFIER,
      inject: [ENVIRONMENT],
      useFactory: (environment: Environment) =>
        createAppleSignedDataVerifier(environment.appleIap),
    },
    ApplePurchaseService,
    AppleWebhookService,
  ],
  exports: [ApplePurchaseService],
})
export class AppleModule {}
