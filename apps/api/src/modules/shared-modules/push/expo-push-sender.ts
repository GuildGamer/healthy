import { Inject, Injectable, Logger } from '@nestjs/common';
import { ENVIRONMENT } from '../config/config.tokens.js';
import type { Environment } from '../config/environment.js';
import type {
  PushMessage,
  PushSender,
  PushSendResult,
} from './push-sender.js';

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

/** Expo rejects larger batches outright. */
const MAX_MESSAGES_PER_REQUEST = 100;

/**
 * Expo replies with one ticket per message, in the order they were sent. A
 * `DeviceNotRegistered` error means the install is gone for good.
 */
type ExpoTicket = {
  status: 'ok' | 'error';
  details?: { error?: string };
};

type ExpoResponse = {
  data?: ExpoTicket[];
};

const PERMANENTLY_INVALID = 'DeviceNotRegistered';

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

@Injectable()
export class ExpoPushSender implements PushSender {
  private readonly logger = new Logger(ExpoPushSender.name);

  constructor(
    @Inject(ENVIRONMENT) private readonly environment: Environment,
  ) {}

  async send(messages: readonly PushMessage[]): Promise<PushSendResult> {
    if (messages.length === 0) {
      return { sentCount: 0, rejectedTokens: [] };
    }

    const results = await Promise.all(
      chunk(messages, MAX_MESSAGES_PER_REQUEST).map((batch) =>
        this.sendBatch(batch),
      ),
    );

    return results.reduce<PushSendResult>(
      (total, result) => ({
        sentCount: total.sentCount + result.sentCount,
        rejectedTokens: [...total.rejectedTokens, ...result.rejectedTokens],
      }),
      { sentCount: 0, rejectedTokens: [] },
    );
  }

  private async sendBatch(
    messages: readonly PushMessage[],
  ): Promise<PushSendResult> {
    const response = await fetch(EXPO_PUSH_ENDPOINT, {
      method: 'POST',
      headers: this.requestHeaders(),
      body: JSON.stringify(
        messages.map((message) => ({
          to: message.expoPushToken,
          title: message.title,
          body: message.body,
          data: message.data,
          sound: 'default',
        })),
      ),
    });

    if (!response.ok) {
      // A provider outage should not fail the dispatch run; the delivery ledger
      // is only written for messages Expo accepted, so these retry next sweep.
      this.logger.error(
        `Expo push rejected a batch of ${messages.length} with HTTP ${response.status}`,
      );
      return { sentCount: 0, rejectedTokens: [] };
    }

    const tickets = ((await response.json()) as ExpoResponse).data ?? [];

    return this.summarise(messages, tickets);
  }

  private summarise(
    messages: readonly PushMessage[],
    tickets: readonly ExpoTicket[],
  ): PushSendResult {
    const rejectedTokens: string[] = [];
    let sentCount = 0;

    tickets.forEach((ticket, index) => {
      if (ticket.status === 'ok') {
        sentCount += 1;
        return;
      }

      if (ticket.details?.error === PERMANENTLY_INVALID) {
        const message = messages[index];
        if (message) {
          rejectedTokens.push(message.expoPushToken);
        }
      }
    });

    return { sentCount, rejectedTokens };
  }

  private requestHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      accept: 'application/json',
      'content-type': 'application/json',
    };

    if (this.environment.expoAccessToken) {
      headers.authorization = `Bearer ${this.environment.expoAccessToken}`;
    }

    return headers;
  }
}
