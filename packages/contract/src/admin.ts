import { oc } from '@orpc/contract';
import { z } from 'zod';
import {
  challengeCaptureKindSchema,
  deviceMetricSchema,
} from './challenge-capture.js';
import { adminRoleSchema } from './admin-roles.js';
import {
  challengeCompletionKindSchema,
  challengeFrequencySchema,
  challengeIconSchema,
  healthCategorySchema,
} from './catalog-fields.js';

export const adminSlugSchema = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const adminChallengeSchema = z.object({
  id: z.string(),
  slug: adminSlugSchema,
  title: z.string().min(1).max(80),
  description: z.string().min(1).max(500),
  instruction: z.string().max(500),
  category: healthCategorySchema,
  icon: challengeIconSchema,
  rewardPoints: z.number().int().positive().max(10_000),
  defaultFrequency: challengeFrequencySchema,
  isDefault: z.boolean(),
  isActive: z.boolean(),
  completionKind: challengeCompletionKindSchema,
  captureKind: challengeCaptureKindSchema,
  deviceMetric: deviceMetricSchema.nullable(),
  targetDurationMinutes: z.number().int().positive().max(1_440).nullable(),
  targetDistanceMeters: z.number().int().positive().max(200_000).nullable(),
  targetCount: z.number().int().positive().max(200_000).nullable(),
  surpriseEvidenceChancePercent: z.number().int().min(0).max(100),
  surpriseEvidenceWindowSeconds: z.number().int().positive().max(3_600),
  surpriseEvidencePenaltyPoints: z.number().int().min(0).max(10_000),
  enrollmentCount: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
});

export const upsertAdminChallengeInputSchema = adminChallengeSchema.omit({
  id: true,
  enrollmentCount: true,
  updatedAt: true,
});

export const updateAdminChallengeInputSchema =
  upsertAdminChallengeInputSchema.extend({
    id: z.string().min(1),
  });

export const adminChallengeIdInputSchema = z.object({
  id: z.string().min(1),
});

export const adminTipSchema = z.object({
  id: z.string(),
  slug: adminSlugSchema,
  category: healthCategorySchema,
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(2_000),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(10_000),
  updatedAt: z.string().datetime(),
});

export const upsertAdminTipInputSchema = adminTipSchema.omit({
  id: true,
  updatedAt: true,
});

export const updateAdminTipInputSchema = upsertAdminTipInputSchema.extend({
  id: z.string().min(1),
});

export const adminTipIdInputSchema = z.object({
  id: z.string().min(1),
});

export const adminWaitlistEntrySchema = z.object({
  id: z.string(),
  email: z.string().email(),
  source: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export const adminMeOutputSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  roles: z.array(adminRoleSchema),
  isActive: z.boolean(),
});

export const adminMemberSummarySchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  displayName: z.string(),
  categories: z.array(healthCategorySchema),
  timeZone: z.string(),
  reminderEnabled: z.boolean(),
  evidenceRemindersEnabled: z.boolean(),
  promotionalMessagesEnabled: z.boolean(),
  showOnLeaderboard: z.boolean(),
  healthLinkStatus: z.enum(['unknown', 'connected', 'denied']),
  pointsBalance: z.number().int(),
  currentStreakDays: z.number().int().nonnegative(),
  deactivatedAt: z.string().datetime().nullable(),
});

export const adminMemberEnrollmentSchema = z.object({
  challengeId: z.string(),
  title: z.string(),
  frequency: challengeFrequencySchema,
  isActive: z.boolean(),
});

export const adminMemberOccurrenceSchema = z.object({
  id: z.string(),
  title: z.string(),
  periodKey: z.string(),
  status: z.enum(['pending', 'in_progress', 'awaiting_evidence', 'completed']),
  outcome: z.enum(['rewarded', 'penalized']).nullable(),
  pointsDelta: z.number().int(),
  completedAt: z.string().datetime().nullable(),
});

export const adminMemberLedgerEntrySchema = z.object({
  id: z.string(),
  delta: z.number().int(),
  reason: z.string(),
  createdAt: z.string().datetime(),
});

export const lookupAdminMemberInputSchema = z.object({
  email: z.string().email(),
});

export const listAdminMembersInputSchema = z
  .object({
    query: z.string().trim().max(120).optional(),
  })
  .default({});

export const adminMemberListItemSchema = adminMemberSummarySchema.pick({
  id: true,
  email: true,
  name: true,
  displayName: true,
  categories: true,
  pointsBalance: true,
  currentStreakDays: true,
  deactivatedAt: true,
}).extend({
  createdAt: z.string().datetime(),
});

export const listAdminMembersOutputSchema = z.object({
  members: z.array(adminMemberListItemSchema),
  totalCount: z.number().int().nonnegative(),
});

export const adminMemberOutputSchema = z.object({
  member: adminMemberSummarySchema,
  enrollments: z.array(adminMemberEnrollmentSchema),
  occurrences: z.array(adminMemberOccurrenceSchema),
  ledger: z.array(adminMemberLedgerEntrySchema),
});

export const adjustAdminMemberPointsInputSchema = z.object({
  userId: z.string().min(1),
  delta: z.number().int().refine((value) => value !== 0, {
    message: 'Delta must be a non-zero integer',
  }),
  reason: z.string().trim().min(3).max(200),
});

export const setAdminMemberActiveInputSchema = z.object({
  userId: z.string().min(1),
  isActive: z.boolean(),
  reason: z.string().trim().min(3).max(200),
});

export const adminOperatorSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  roles: z.array(adminRoleSchema),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
});

export const inviteAdminInputSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(1).max(80),
  password: z.string().min(8).max(128),
  roles: z.array(adminRoleSchema).min(1),
});

export const updateAdminRolesInputSchema = z.object({
  adminUserId: z.string().min(1),
  roles: z.array(adminRoleSchema).min(1),
});

export const setAdminOperatorActiveInputSchema = z.object({
  adminUserId: z.string().min(1),
  isActive: z.boolean(),
});

export const publicTipSchema = z.object({
  id: z.string(),
  category: healthCategorySchema,
  title: z.string(),
  body: z.string(),
});

export const listPublicTipsOutputSchema = z.object({
  tips: z.array(publicTipSchema),
});

export const listAdminChallengesOutputSchema = z.object({
  challenges: z.array(adminChallengeSchema),
});

export const adminChallengeOutputSchema = z.object({
  challenge: adminChallengeSchema,
});

export const listAdminTipsOutputSchema = z.object({
  tips: z.array(adminTipSchema),
});

export const adminTipOutputSchema = z.object({
  tip: adminTipSchema,
});

export const listAdminWaitlistOutputSchema = z.object({
  entries: z.array(adminWaitlistEntrySchema),
});

export const adjustAdminMemberPointsOutputSchema = z.object({
  member: adminMemberSummarySchema,
  appliedDelta: z.number().int(),
});

export const listAdminOperatorsOutputSchema = z.object({
  operators: z.array(adminOperatorSchema),
});

export const adminOperatorOutputSchema = z.object({
  operator: adminOperatorSchema,
});

export const adminMeContract = oc
  .route({ method: 'GET', path: '/admin/me' })
  .output(adminMeOutputSchema);

export const listAdminChallengesContract = oc
  .route({ method: 'GET', path: '/admin/challenges' })
  .output(listAdminChallengesOutputSchema);

export const createAdminChallengeContract = oc
  .route({ method: 'POST', path: '/admin/challenges' })
  .input(upsertAdminChallengeInputSchema)
  .output(adminChallengeOutputSchema);

export const updateAdminChallengeContract = oc
  .route({ method: 'PUT', path: '/admin/challenges' })
  .input(updateAdminChallengeInputSchema)
  .output(adminChallengeOutputSchema);

export const listAdminTipsContract = oc
  .route({ method: 'GET', path: '/admin/tips' })
  .output(listAdminTipsOutputSchema);

export const createAdminTipContract = oc
  .route({ method: 'POST', path: '/admin/tips' })
  .input(upsertAdminTipInputSchema)
  .output(adminTipOutputSchema);

export const updateAdminTipContract = oc
  .route({ method: 'PUT', path: '/admin/tips' })
  .input(updateAdminTipInputSchema)
  .output(adminTipOutputSchema);

export const listAdminWaitlistContract = oc
  .route({ method: 'GET', path: '/admin/waitlist' })
  .output(listAdminWaitlistOutputSchema);

export const listAdminMembersContract = oc
  .route({ method: 'GET', path: '/admin/members' })
  .input(listAdminMembersInputSchema)
  .output(listAdminMembersOutputSchema);

export const lookupAdminMemberContract = oc
  .route({ method: 'GET', path: '/admin/members/lookup' })
  .input(lookupAdminMemberInputSchema)
  .output(adminMemberOutputSchema);

export const adjustAdminMemberPointsContract = oc
  .route({ method: 'POST', path: '/admin/members/points' })
  .input(adjustAdminMemberPointsInputSchema)
  .output(adjustAdminMemberPointsOutputSchema);

export const setAdminMemberActiveContract = oc
  .route({ method: 'POST', path: '/admin/members/active' })
  .input(setAdminMemberActiveInputSchema)
  .output(adminMemberOutputSchema);

export const listAdminOperatorsContract = oc
  .route({ method: 'GET', path: '/admin/operators' })
  .output(listAdminOperatorsOutputSchema);

export const inviteAdminOperatorContract = oc
  .route({ method: 'POST', path: '/admin/operators' })
  .input(inviteAdminInputSchema)
  .output(adminOperatorOutputSchema);

export const updateAdminOperatorRolesContract = oc
  .route({ method: 'PUT', path: '/admin/operators/roles' })
  .input(updateAdminRolesInputSchema)
  .output(adminOperatorOutputSchema);

export const setAdminOperatorActiveContract = oc
  .route({ method: 'POST', path: '/admin/operators/active' })
  .input(setAdminOperatorActiveInputSchema)
  .output(adminOperatorOutputSchema);

export const listTipsContract = oc
  .route({ method: 'GET', path: '/tips' })
  .output(listPublicTipsOutputSchema);

export const adminContract = {
  me: adminMeContract,
  listChallenges: listAdminChallengesContract,
  createChallenge: createAdminChallengeContract,
  updateChallenge: updateAdminChallengeContract,
  listTips: listAdminTipsContract,
  createTip: createAdminTipContract,
  updateTip: updateAdminTipContract,
  listWaitlist: listAdminWaitlistContract,
  listMembers: listAdminMembersContract,
  lookupMember: lookupAdminMemberContract,
  adjustMemberPoints: adjustAdminMemberPointsContract,
  setMemberActive: setAdminMemberActiveContract,
  listOperators: listAdminOperatorsContract,
  inviteOperator: inviteAdminOperatorContract,
  updateOperatorRoles: updateAdminOperatorRolesContract,
  setOperatorActive: setAdminOperatorActiveContract,
};

export type AdminContract = typeof adminContract;
export type AdminMeOutput = z.infer<typeof adminMeOutputSchema>;
export type AdminChallenge = z.infer<typeof adminChallengeSchema>;
export type UpsertAdminChallengeInput = z.infer<
  typeof upsertAdminChallengeInputSchema
>;
export type UpdateAdminChallengeInput = z.infer<
  typeof updateAdminChallengeInputSchema
>;
export type AdminTip = z.infer<typeof adminTipSchema>;
export type UpsertAdminTipInput = z.infer<typeof upsertAdminTipInputSchema>;
export type UpdateAdminTipInput = z.infer<typeof updateAdminTipInputSchema>;
export type AdminWaitlistEntry = z.infer<typeof adminWaitlistEntrySchema>;
export type AdminMemberSummary = z.infer<typeof adminMemberSummarySchema>;
export type AdminMemberListItem = z.infer<typeof adminMemberListItemSchema>;
export type AdminMemberOutput = z.infer<typeof adminMemberOutputSchema>;
export type ListAdminMembersInput = z.input<typeof listAdminMembersInputSchema>;
export type ListAdminMembersOutput = z.infer<typeof listAdminMembersOutputSchema>;
export type AdjustAdminMemberPointsInput = z.infer<
  typeof adjustAdminMemberPointsInputSchema
>;
export type SetAdminMemberActiveInput = z.infer<
  typeof setAdminMemberActiveInputSchema
>;
export type AdminOperator = z.infer<typeof adminOperatorSchema>;
export type InviteAdminInput = z.infer<typeof inviteAdminInputSchema>;
export type PublicTip = z.infer<typeof publicTipSchema>;
export type ListPublicTipsOutput = z.infer<typeof listPublicTipsOutputSchema>;
