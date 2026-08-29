import { Controller } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { Public } from '@thallesp/nestjs-better-auth';
import { appContract } from '@product/contract';
import { HealthService } from './health.service.js';

@Controller()
@Public()
export class HealthRpcController {
  constructor(private readonly healthService: HealthService) {}

  @Implement(appContract.health)
  health() {
    return implement(appContract.health).handler(() => {
      return this.healthService.getContractHealth();
    });
  }
}
