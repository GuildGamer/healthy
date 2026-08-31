import { Controller, Req } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { adminContract } from '@product/contract';
import type { RequestWithAuth } from '../../../shared/types/request-with-auth.js';
import { AdminAuth } from '../../shared-modules/auth/admin.decorators.js';
import { AdminMembershipService } from './admin-membership.service.js';

@Controller()
@AdminAuth('content')
export class AdminMembershipController {
  constructor(private readonly membership: AdminMembershipService) {}

  @Implement(adminContract.listMembershipPlans)
  listMembershipPlans(@Req() request: RequestWithAuth) {
    const admin = request.admin ?? null;
    return implement(adminContract.listMembershipPlans).handler(async () => {
      return this.membership.list(admin);
    });
  }

  @Implement(adminContract.createMembershipPlan)
  createMembershipPlan(@Req() request: RequestWithAuth) {
    const admin = request.admin ?? null;
    return implement(adminContract.createMembershipPlan).handler(
      async ({ input }) => {
        return this.membership.create(admin, input);
      },
    );
  }

  @Implement(adminContract.updateMembershipPlan)
  updateMembershipPlan(@Req() request: RequestWithAuth) {
    const admin = request.admin ?? null;
    return implement(adminContract.updateMembershipPlan).handler(
      async ({ input }) => {
        return this.membership.update(admin, input);
      },
    );
  }
}
