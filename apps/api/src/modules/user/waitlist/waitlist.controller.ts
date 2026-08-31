import { Controller } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { Public } from '@thallesp/nestjs-better-auth';
import { appContract } from '@product/contract';
import { WaitlistService } from './waitlist.service.js';

@Controller()
@Public()
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Implement(appContract.waitlist)
  waitlist() {
    return implement(appContract.waitlist).handler(async ({ input }) => {
      return this.waitlistService.join(input.email, input.source);
    });
  }
}
