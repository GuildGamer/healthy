jest.mock('@/components/challenges/useCompleteChallenge', () => ({
  refreshAfterCompletion: jest.fn(),
}));

jest.mock('@/lib/completion-outbox', () => ({
  listPendingCompletions: jest.fn(async () => []),
  markPendingCompletionAttempt: jest.fn(),
  removePendingCompletion: jest.fn(),
}));

jest.mock('@/lib/execute-pending-completion', () => ({
  executePendingCompletion: jest.fn(),
}));

jest.mock('@/lib/query-client-holder', () => ({
  getAppQueryClient: jest.fn(() => null),
}));

import { classifySyncError, nextBackoffMs } from './completion-sync';

describe('nextBackoffMs', () => {
  it('grows 5s, 15s, 1m, 5m then stays at 5m', () => {
    expect(nextBackoffMs(0)).toBe(5_000);
    expect(nextBackoffMs(1)).toBe(15_000);
    expect(nextBackoffMs(2)).toBe(60_000);
    expect(nextBackoffMs(3)).toBe(5 * 60_000);
    expect(nextBackoffMs(10)).toBe(5 * 60_000);
  });
});

describe('classifySyncError', () => {
  it('retries network failures, timeouts, 5xx and 429', () => {
    expect(classifySyncError(new TypeError('Network request failed'))).toBe('retryable');
    expect(classifySyncError(new Error('timeout'))).toBe('retryable');
    expect(classifySyncError(Object.assign(new Error('server'), { status: 503 }))).toBe(
      'retryable',
    );
    expect(classifySyncError(Object.assign(new Error('slow down'), { status: 429 }))).toBe(
      'retryable',
    );
  });

  it('parks other 4xx as permanent', () => {
    expect(classifySyncError(Object.assign(new Error('bad'), { status: 400 }))).toBe('permanent');
    expect(classifySyncError(new Error('Request failed with status 422'))).toBe('permanent');
  });
});
