import type { HealthCategory } from '@product/db';

export type MeDto = {
  id: string;
  email: string;
  name: string | null;
  categories: HealthCategory[];
  pointsBalance: number;
  currentStreakDays: number;
  timeZone: string;
  displayName: string;
  reminderEnabled: boolean;
  reminderMinute: number;
  evidenceRemindersEnabled: boolean;
  promotionalMessagesEnabled: boolean;
  showOnLeaderboard: boolean;
};
