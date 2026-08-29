import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { HealthRpcController } from './health.rpc.controller.js';
import { HealthService } from './health.service.js';

@Module({
  controllers: [HealthController, HealthRpcController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
