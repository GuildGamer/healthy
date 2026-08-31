import { Controller, Req } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { adminContract } from '@product/contract';
import type { RequestWithAuth } from '../../../shared/types/request-with-auth.js';
import { AdminAuth } from '../../shared-modules/auth/admin.decorators.js';
import { AdminCatalogService } from './catalog.service.js';

@Controller()
@AdminAuth('content')
export class AdminCatalogController {
  constructor(private readonly catalog: AdminCatalogService) {}

  @Implement(adminContract.listChallenges)
  listChallenges(@Req() request: RequestWithAuth) {
    const admin = request.admin ?? null;
    return implement(adminContract.listChallenges).handler(async () => {
      return this.catalog.list(admin);
    });
  }

  @Implement(adminContract.createChallenge)
  createChallenge(@Req() request: RequestWithAuth) {
    const admin = request.admin ?? null;
    return implement(adminContract.createChallenge).handler(async ({ input }) => {
      return this.catalog.create(admin, input);
    });
  }

  @Implement(adminContract.updateChallenge)
  updateChallenge(@Req() request: RequestWithAuth) {
    const admin = request.admin ?? null;
    return implement(adminContract.updateChallenge).handler(async ({ input }) => {
      return this.catalog.update(admin, input);
    });
  }
}
