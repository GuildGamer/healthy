import type {
  ChallengeCompletionKind,
  ChallengeHistoryEntry,
  ChallengeHistoryLog,
  TodayChallenge,
} from '@product/client';

const GLUCOSE_CONTEXT: Record<string, string> = {
  fasting: 'Fasting',
  before_meal: 'Before meal',
  after_meal: 'After meal',
};

const DEVICE_METRIC: Record<string, string> = {
  walk: 'Walk',
  run: 'Run',
  cycle: 'Ride',
  steps: 'Steps',
  sleep: 'Sleep',
  weight: 'Weight',
  heart_rate: 'Heart rate',
};

export function formatHistoryWhen(completedAt: string): string {
  return new Date(completedAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

export function historyLogCopy(log: ChallengeHistoryLog | null): string {
  if (!log) {
    return 'Completed';
  }

  if (log.kind === 'vitals_bp') {
    const pulse = log.pulse == null ? '' : ` · ${log.pulse} bpm`;
    return `${log.systolic}/${log.diastolic}${pulse}`;
  }

  if (log.kind === 'glucose') {
    const context = GLUCOSE_CONTEXT[log.context] ?? log.context;
    return `${log.mmolL} mmol/L · ${context}`;
  }

  if (log.kind === 'peak_flow') {
    return `${log.bestLitresPerMinute} L/min`;
  }

  if (log.kind === 'water') {
    return `${log.amount} ${log.unit}`;
  }

  if (log.kind === 'carbs') {
    if (log.grams != null) {
      return `${log.grams} g`;
    }

    return log.note ?? 'Carbs logged';
  }

  if (log.kind === 'evidence_photo') {
    return 'Gym selfie';
  }

  if (log.kind === 'device') {
    return deviceLogCopy(log);
  }

  return 'Checked in';
}

export function historyEvidenceCopy(
  evidence: ChallengeHistoryEntry['evidence'],
): string | null {
  if (evidence === 'submitted') {
    return 'Photo sent';
  }

  if (evidence === 'skipped') {
    return 'Photo skipped';
  }

  if (evidence === 'expired') {
    return 'Photo timed out';
  }

  return null;
}

export function mergeTodayIntoHistory(
  entries: ChallengeHistoryEntry[],
  occurrence: TodayChallenge | null | undefined,
): ChallengeHistoryEntry[] {
  if (!occurrence || occurrence.status !== 'completed') {
    return entries;
  }

  if (entries.some((entry) => entry.id === occurrence.id)) {
    return entries;
  }

  return [
    {
      id: occurrence.id,
      periodKey: occurrence.periodKey,
      completedAt: `${occurrence.periodKey}T12:00:00.000Z`,
      outcome: 'rewarded',
      pointsDelta: occurrence.rewardPoints,
      log: historyLogFromKind(occurrence.completionKind),
      evidence: null,
    },
    ...entries,
  ];
}

function historyLogFromKind(
  kind: ChallengeCompletionKind,
): ChallengeHistoryLog | null {
  if (kind === 'evidence_photo') {
    return { kind: 'evidence_photo' };
  }

  if (kind === 'check_in') {
    return { kind: 'check_in' };
  }

  return null;
}

function deviceLogCopy(
  log: Extract<ChallengeHistoryLog, { kind: 'device' }>,
): string {
  const metric = DEVICE_METRIC[log.metric] ?? log.metric;

  if (log.durationSeconds != null) {
    const minutes = Math.max(1, Math.round(log.durationSeconds / 60));
    return `${minutes} min ${metric.toLowerCase()}`;
  }

  if (log.distanceMeters != null) {
    return `${log.distanceMeters} m · ${metric}`;
  }

  if (log.count != null) {
    return `${log.count} · ${metric}`;
  }

  return metric;
}
