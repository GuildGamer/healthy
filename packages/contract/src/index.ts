import { oc } from '@orpc/contract';
import { z } from 'zod';

export const healthOutputSchema = z.object({
  status: z.literal('ok'),
  service: z.string(),
  timestamp: z.string().datetime(),
});

export const meOutputSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
});

export const healthContract = oc
  .route({ method: 'GET', path: '/health' })
  .output(healthOutputSchema);

export const meContract = oc.route({ method: 'GET', path: '/me' }).output(meOutputSchema);

export const waitlistInputSchema = z.object({
  email: z.string().email(),
  source: z.string().max(100).optional(),
});

export const waitlistOutputSchema = z.object({
  id: z.string(),
  email: z.string().email(),
});

export const waitlistContract = oc
  .route({ method: 'POST', path: '/waitlist' })
  .input(waitlistInputSchema)
  .output(waitlistOutputSchema);

export const appContract = {
  health: healthContract,
  me: meContract,
  waitlist: waitlistContract,
};

export type AppContract = typeof appContract;
export type HealthOutput = z.infer<typeof healthOutputSchema>;
export type MeOutput = z.infer<typeof meOutputSchema>;
export type WaitlistInput = z.infer<typeof waitlistInputSchema>;
export type WaitlistOutput = z.infer<typeof waitlistOutputSchema>;
