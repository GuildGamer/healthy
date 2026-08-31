/**
 * The port the reminder domain talks to. Expo is one implementation; keeping
 * the provider behind this interface stops its types leaking into services.
 */

export type PushMessage = {
  expoPushToken: string;
  title: string;
  body: string;
  /** Payload the app reads when the notification is tapped. */
  data: Record<string, string>;
};

/** Tokens the provider says are permanently invalid, so we can retire them. */
export type PushSendResult = {
  sentCount: number;
  rejectedTokens: string[];
};

export interface PushSender {
  send(messages: readonly PushMessage[]): Promise<PushSendResult>;
}

export const PUSH_SENDER = Symbol('PUSH_SENDER');
