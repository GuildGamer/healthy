const ONES = [
  '',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
] as const;

const TEENS = [
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
] as const;

const TENS = [
  '',
  '',
  'twenty',
  'thirty',
  'forty',
  'fifty',
  'sixty',
  'seventy',
  'eighty',
  'ninety',
] as const;

/** Spoken count for habit titles. Falls back to digits outside 1–100. */
export function countInWords(count: number): string {
  if (!Number.isInteger(count) || count < 1) {
    return String(count);
  }

  if (count < 10) {
    return ONES[count] ?? String(count);
  }

  if (count < 20) {
    return TEENS[count - 10] ?? String(count);
  }

  if (count > 100) {
    return String(count);
  }

  if (count === 100) {
    return 'one hundred';
  }

  const tens = TENS[Math.floor(count / 10)];
  const ones = ONES[count % 10];
  if (!tens) {
    return String(count);
  }

  return ones ? `${tens}-${ones}` : tens;
}

export function formatPushupChallengeTitle(count: number): string {
  const noun = count === 1 ? 'push-up' : 'push-ups';
  return `Do ${countInWords(count)} ${noun}`;
}

/** Push-up names follow the member’s target. Other catalog titles stay as stored. */
export function displayChallengeTitle(input: {
  title: string;
  metric?: string | null;
  count?: number | null;
}): string {
  if (input.metric === 'pushups' && input.count != null && input.count > 0) {
    return formatPushupChallengeTitle(input.count);
  }

  return input.title;
}
