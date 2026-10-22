/** What one number on a reading sheet accepts. */
export type ReadingRules = {
  min: number;
  max: number;
  /** Digits before any decimal point. */
  maxDigits: number;
  /** Digits allowed after the point; zero hides the point key. */
  decimals: 0 | 1;
  /** Said under the number when it can no longer fit, such as "The top number should be…". */
  rangeMessage: string;
};

export type BloodPressureField = 'top' | 'bottom';

export type BloodPressureEntry = {
  top: string;
  bottom: string;
  active: BloodPressureField;
};
