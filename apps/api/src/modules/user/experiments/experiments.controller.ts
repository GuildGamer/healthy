import { Controller, Req } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { Public } from '@thallesp/nestjs-better-auth';
import { appContract } from '@product/contract';
import type { RequestWithAuth } from '../../../shared/types/request-with-auth.js';
import { ExperimentsService } from './experiments.service.js';

@Controller()
@Public()
export class ExperimentsController {
  constructor(private readonly experimentsService: ExperimentsService) {}

  @Implement(appContract.getExperimentAssignment)
  getExperimentAssignment(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.getExperimentAssignment).handler(
      async ({ input }) => {
        return this.experimentsService.getOrAssign(user, input.experimentKey);
      },
    );
  }
}
