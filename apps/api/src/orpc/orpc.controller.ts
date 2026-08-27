import { Controller, Req } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { Public } from '@thallesp/nestjs-better-auth';
import { appContract } from '@product/contract';
import type { AuthenticatedUser } from '../me/me.service.js';
import { HealthService } from '../health/health.service.js';
import { MeService } from '../me/me.service.js';
import { WaitlistService } from '../waitlist/waitlist.service.js';

type RequestWithAuth = {
  user?: AuthenticatedUser | null;
};

@Controller()
@Public()
export class OrpcController {
  constructor(
    private readonly healthService: HealthService,
    private readonly meService: MeService,
    private readonly waitlistService: WaitlistService,
  ) {}

  @Implement(appContract.health)
  health() {
    return implement(appContract.health).handler(() => {
      return this.healthService.getContractHealth();
    });
  }

  @Implement(appContract.me)
  me(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.me).handler(() => {
      return this.meService.getMe(user);
    });
  }

  @Implement(appContract.waitlist)
  waitlist() {
    return implement(appContract.waitlist).handler(async ({ input }) => {
      return this.waitlistService.join(input.email, input.source);
    });
  }
}
