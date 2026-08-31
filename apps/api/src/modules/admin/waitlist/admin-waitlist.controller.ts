import { Controller, Req } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { adminContract } from '@product/contract';
import type { RequestWithAuth } from '../../../shared/types/request-with-auth.js';
import { AdminAuth } from '../../shared-modules/auth/admin.decorators.js';
import { AdminWaitlistService } from './admin-waitlist.service.js';

@Controller()
@AdminAuth('content')
export class AdminWaitlistController {
  constructor(private readonly waitlist: AdminWaitlistService) {}

  @Implement(adminContract.listWaitlist)
  listWaitlist(@Req() request: RequestWithAuth) {
    const admin = request.admin ?? null;
    return implement(adminContract.listWaitlist).handler(async () => {
      return this.waitlist.list(admin);
    });
  }
}
