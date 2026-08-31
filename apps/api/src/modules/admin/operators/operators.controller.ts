import { Controller, Req } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { adminContract } from '@product/contract';
import type { RequestWithAuth } from '../../../shared/types/request-with-auth.js';
import { AdminAuth } from '../../shared-modules/auth/admin.decorators.js';
import { AdminOperatorsService } from './operators.service.js';

@Controller()
@AdminAuth('superadmin')
export class AdminOperatorsController {
  constructor(private readonly operators: AdminOperatorsService) {}

  @Implement(adminContract.listOperators)
  listOperators(@Req() request: RequestWithAuth) {
    const admin = request.admin ?? null;
    return implement(adminContract.listOperators).handler(async () => {
      return this.operators.list(admin);
    });
  }

  @Implement(adminContract.inviteOperator)
  inviteOperator(@Req() request: RequestWithAuth) {
    const admin = request.admin ?? null;
    return implement(adminContract.inviteOperator).handler(async ({ input }) => {
      return this.operators.invite(admin, input);
    });
  }

  @Implement(adminContract.updateOperatorRoles)
  updateOperatorRoles(@Req() request: RequestWithAuth) {
    const admin = request.admin ?? null;
    return implement(adminContract.updateOperatorRoles).handler(async ({ input }) => {
      return this.operators.updateRoles(admin, input.adminUserId, input.roles);
    });
  }

  @Implement(adminContract.setOperatorActive)
  setOperatorActive(@Req() request: RequestWithAuth) {
    const admin = request.admin ?? null;
    return implement(adminContract.setOperatorActive).handler(async ({ input }) => {
      return this.operators.setActive(admin, input.adminUserId, input.isActive);
    });
  }
}
