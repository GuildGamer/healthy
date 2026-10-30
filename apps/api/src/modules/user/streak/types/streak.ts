import type { PrismaClient } from '@product/db';

export type StreakStatus = {
  currentStreakDays: number;
  streakLapsedYesterday: boolean;
};

export type StoredStreak = {
  storedStreakDays: number;
  lastActiveDayKey: string | null;
  todayKey: string;
};

export type StreakAdvance = {
  currentStreakDays: number;
  /** False when today was already counted, so nothing changed. */
  advanced: boolean;
};

/** The plain client or an open transaction; the streak only touches the profile. */
export type StreakClient = Pick<PrismaClient, 'userProfile'>;
