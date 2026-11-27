import { Controller, Req } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { adminContract } from '@product/contract';
import type { RequestWithAuth } from '../../../shared/types/request-with-auth.js';
import { AdminAuth } from '../../shared-modules/auth/admin.decorators.js';
import { AdminStagingTestersService } from './staging-testers.service.js';

@Controller()
@AdminAuth('support')
export class AdminStagingTestersController {
  constructor(private readonly stagingTesters: AdminStagingTestersService) {}

  @Implement(adminContract.listStagingTesterGrants)
  listStagingTesterGrants(@Req() request: RequestWithAuth) {
    const admin = request.admin ?? null;
    return implement(adminContract.listStagingTesterGrants).handler(async () => {
      return this.stagingTesters.list(admin);
    });
  }

  @Implement(adminContract.upsertStagingTesterGrant)
  upsertStagingTesterGrant(@Req() request: RequestWithAuth) {
    const admin = request.admin ?? null;
    return implement(adminContract.upsertStagingTesterGrant).handler(
      async ({ input }) => {
        return this.stagingTesters.upsert(admin, input);
      },
    );
  }

  @Implement(adminContract.setStagingTesterGrantEnabled)
  setStagingTesterGrantEnabled(@Req() request: RequestWithAuth) {
    const admin = request.admin ?? null;
    return implement(adminContract.setStagingTesterGrantEnabled).handler(
      async ({ input }) => {
        return this.stagingTesters.setEnabled(admin, input);
      },
    );
  }

  @Implement(adminContract.deleteStagingTesterGrant)
  deleteStagingTesterGrant(@Req() request: RequestWithAuth) {
    const admin = request.admin ?? null;
    return implement(adminContract.deleteStagingTesterGrant).handler(
      async ({ input }) => {
        return this.stagingTesters.delete(admin, input);
      },
    );
  }
}
