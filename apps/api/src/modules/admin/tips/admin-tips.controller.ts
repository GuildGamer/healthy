import { Controller, Req } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { adminContract } from '@product/contract';
import type { RequestWithAuth } from '../../../shared/types/request-with-auth.js';
import { AdminAuth } from '../../shared-modules/auth/admin.decorators.js';
import { AdminTipsService } from './admin-tips.service.js';

@Controller()
@AdminAuth('content')
export class AdminTipsController {
  constructor(private readonly tips: AdminTipsService) {}

  @Implement(adminContract.listTips)
  listTips(@Req() request: RequestWithAuth) {
    const admin = request.admin ?? null;
    return implement(adminContract.listTips).handler(async () => {
      return this.tips.list(admin);
    });
  }

  @Implement(adminContract.createTip)
  createTip(@Req() request: RequestWithAuth) {
    const admin = request.admin ?? null;
    return implement(adminContract.createTip).handler(async ({ input }) => {
      return this.tips.create(admin, input);
    });
  }

  @Implement(adminContract.updateTip)
  updateTip(@Req() request: RequestWithAuth) {
    const admin = request.admin ?? null;
    return implement(adminContract.updateTip).handler(async ({ input }) => {
      return this.tips.update(admin, input);
    });
  }
}
