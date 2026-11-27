import { oc } from '@orpc/contract';
import { z } from 'zod';

/**
 * Long enough to be useful, short enough to stay a label rather than a bio.
 * Renaming is optional — a crew arrives already named.
 */
export const CREW_NAME_MAX = 40;

export const crewNameSchema = z.string().trim().min(1).max(CREW_NAME_MAX);

export { crewLabel } from './match-board.js';

export const crewSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  /** Excludes anyone who has left, so a stale crew cannot look fuller than it is. */
  memberCount: z.number().int().positive(),
  memberNames: z.array(z.string().min(1)),
  isOwner: z.boolean(),
});

export type Crew = z.infer<typeof crewSchema>;

export const listCrewsOutputSchema = z.object({
  crews: z.array(crewSchema),
});

/** Someone the caller has already shared a private contest with. */
export const acquaintanceSchema = z.object({
  userId: z.string().min(1),
  displayName: z.string().min(1),
});

export const listAcquaintancesOutputSchema = z.object({
  people: z.array(acquaintanceSchema),
});

/**
 * Crews are saved from a contest that already happened, never assembled from a
 * member picker — so the only input is which contest to keep.
 * Optional name keeps one-tap save (derived label) while companies can label.
 */
export const saveCrewInputSchema = z.object({
  matchId: z.string().min(1),
  name: crewNameSchema.optional(),
});

export const saveCrewOutputSchema = z.object({
  crew: crewSchema,
  /**
   * True when an identical roster was already saved and is being handed back
   * instead. Beneficiary lists rot because nothing dedupes them.
   */
  alreadyExisted: z.boolean(),
});

export const renameCrewInputSchema = z.object({
  crewId: z.string().min(1),
  name: crewNameSchema,
});

export const crewIdInputSchema = z.object({
  crewId: z.string().min(1),
});

export const listCrewsContract = oc
  .route({ method: 'GET', path: '/crews' })
  .output(listCrewsOutputSchema);

export const listAcquaintancesContract = oc
  .route({ method: 'GET', path: '/crews/people' })
  .output(listAcquaintancesOutputSchema);

export const saveCrewContract = oc
  .route({ method: 'POST', path: '/crews' })
  .input(saveCrewInputSchema)
  .output(saveCrewOutputSchema);

export const renameCrewContract = oc
  .route({ method: 'POST', path: '/crews/rename' })
  .input(renameCrewInputSchema)
  .output(crewSchema);

export const leaveCrewContract = oc
  .route({ method: 'POST', path: '/crews/leave' })
  .input(crewIdInputSchema)
  .output(listCrewsOutputSchema);

export type ListCrewsOutput = z.infer<typeof listCrewsOutputSchema>;
export type Acquaintance = z.infer<typeof acquaintanceSchema>;
export type ListAcquaintancesOutput = z.infer<typeof listAcquaintancesOutputSchema>;
export type SaveCrewInput = z.infer<typeof saveCrewInputSchema>;
export type SaveCrewOutput = z.infer<typeof saveCrewOutputSchema>;
export type RenameCrewInput = z.infer<typeof renameCrewInputSchema>;
export type CrewIdInput = z.infer<typeof crewIdInputSchema>;
