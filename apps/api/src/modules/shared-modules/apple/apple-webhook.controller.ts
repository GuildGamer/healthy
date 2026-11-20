import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Public } from '@thallesp/nestjs-better-auth';
import { AppleWebhookService } from './apple-webhook.service.js';

@Controller('webhooks')
export class AppleWebhookController {
  constructor(private readonly webhooks: AppleWebhookService) {}

  /**
   * App Store Server Notifications V2. Signature is the signedPayload JWS;
   * `@Public()` skips the session check because Apple cannot send one.
   */
  @Public()
  @Post('apple')
  @HttpCode(200)
  async handle(
    @Body() body: unknown,
  ): Promise<{ received: true }> {
    const signedPayload = readSignedPayload(body);
    if (!signedPayload) {
      throw new BadRequestException('signedPayload is required');
    }

    const result = await this.webhooks.handleSignedPayload(signedPayload);
    if (result.success) {
      return { received: true };
    }

    if (result.error === 'apple_disabled') {
      throw new ServiceUnavailableException('Apple IAP is not configured');
    }

    throw new BadRequestException('Invalid Apple notification');
  }
}

function readSignedPayload(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }

  if (!('signedPayload' in body)) {
    return null;
  }

  const value = body.signedPayload;
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
