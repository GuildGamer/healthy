import { Controller } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { appContract } from '@product/contract';
import { HealthService } from '../health/health.service';
import { MeService } from '../me/me.service';
import { WaitlistService } from '../waitlist/waitlist.service';

type OrpcRequestContext = {
  user?: { id: string; email: string; name?: string | null } | null;
};

@Controller()
@AllowAnonymous()
export class OrpcController {
  constructor(
    private readonly healthService: HealthService,
    private readonly meService: MeService,
    private readonly waitlistService: WaitlistService,
  ) {}

  /**
   * Auth is enforced inside procedure handlers / middleware so oRPC owns
   * authentication for contract routes (Nest global guard is bypassed via @AllowAnonymous).
   */
  @Implement(appContract)
  app() {
    return {
      health: implement(appContract.health).handler(() => {
        return this.healthService.getContractHealth();
      }),
      me: implement(appContract.me).handler(({ context }) => {
        const typedContext = context as OrpcRequestContext;
        return this.meService.getMe(typedContext.user);
      }),
      waitlist: implement(appContract.waitlist).handler(async ({ input }) => {
        return this.waitlistService.join(input.email, input.source);
      }),
    };
  }
}
