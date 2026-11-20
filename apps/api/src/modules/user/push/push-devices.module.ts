import { Module } from '@nestjs/common';
import { PushInfrastructureModule } from '../../shared-modules/push/index.js';
import { PushDevicesController } from './push-devices.controller.js';

@Module({
  imports: [PushInfrastructureModule],
  controllers: [PushDevicesController],
})
export class PushDevicesModule {}
