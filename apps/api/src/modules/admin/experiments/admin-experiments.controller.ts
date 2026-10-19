import { Controller, Req } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { adminContract } from '@product/contract';
import type { RequestWithAuth } from '../../../shared/types/request-with-auth.js';
import { AdminAuth } from '../../shared-modules/auth/admin.decorators.js';
import { AdminExperimentsService } from './admin-experiments.service.js';

@Controller()
@AdminAuth('any')
export class AdminExperimentsController {
  constructor(private readonly experiments: AdminExperimentsService) {}

  @Implement(adminContract.listExperiments)
  listExperiments(@Req() request: RequestWithAuth) {
    const admin = request.admin ?? null;
    return implement(adminContract.listExperiments).handler(async () => {
      return this.experiments.list(admin);
    });
  }

  @Implement(adminContract.getExperiment)
  getExperiment(@Req() request: RequestWithAuth) {
    const admin = request.admin ?? null;
    return implement(adminContract.getExperiment).handler(async ({ input }) => {
      return this.experiments.get(admin, input.id);
    });
  }

  @Implement(adminContract.updateExperimentWeights)
  updateExperimentWeights(@Req() request: RequestWithAuth) {
    const admin = request.admin ?? null;
    return implement(adminContract.updateExperimentWeights).handler(
      async ({ input }) => {
        return this.experiments.updateWeights(admin, input);
      },
    );
  }
}
