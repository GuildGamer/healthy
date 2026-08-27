import { Controller } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { Public } from '@thallesp/nestjs-better-auth';
import { appContract } from '@product/contract';
import { requireAuth } from '../auth/orpc-auth.js';
import { HealthService } from '../health/health.service.js';
import { MeService } from '../me/me.service.js';
import { WaitlistService } from '../waitlist/waitlist.service.js';

@Controller()
@Public()
export class OrpcController {
  constructor(
    private readonly healthService: HealthService,
    private readonly meService: MeService,
    private readonly waitlistService: WaitlistService,
  ) {}

  /**
   * Auth is enforced inside procedure middleware so oRPC owns authentication
   * for contract routes (Nest global guard is bypassed via @Public).
   */
  @Implement(appContract)
  app() {
    return {
      health: implement(appContract.health).handler(() => {
        return this.healthService.getContractHealth();
      }),
      me: implement(appContract.me)
        .use(requireAuth)
        .handler(({ context }) => {
          return this.meService.getMe(context.user);
        }),
      waitlist: implement(appContract.waitlist).handler(async ({ input }) => {
        return this.waitlistService.join(input.email, input.source);
      }),
    };
  }
}
