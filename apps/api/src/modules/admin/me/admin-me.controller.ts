import { Controller, Req } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { adminContract } from '@product/contract';
import type { RequestWithAuth } from '../../../shared/types/request-with-auth.js';
import { AdminAuth } from '../../shared-modules/auth/admin.decorators.js';
import { AdminMeService } from './admin-me.service.js';

@Controller()
@AdminAuth('any')
export class AdminMeController {
  constructor(private readonly adminMe: AdminMeService) {}

  @Implement(adminContract.me)
  me(@Req() request: RequestWithAuth) {
    const admin = request.admin ?? null;
    return implement(adminContract.me).handler(async () => {
      return this.adminMe.getMe(admin);
    });
  }
}
