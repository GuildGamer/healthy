import type { HealthCategory } from '@product/contract';

/** Which ledger rows a ranking reads: `[start, end)`, either side open when null. */
export type LedgerWindow = {
  start: Date | null;
  end: Date | null;
  category: HealthCategory | undefined;
};
