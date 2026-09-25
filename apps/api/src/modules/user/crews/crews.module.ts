import { Module } from '@nestjs/common';
import { PushInfrastructureModule } from '../../shared-modules/push/index.js';
import { CrewSeatNotifierService } from './crew-seat-notifier.service.js';
import { CrewsController } from './crews.controller.js';
import { CrewsService } from './crews.service.js';

@Module({
  imports: [PushInfrastructureModule],
  controllers: [CrewsController],
  providers: [CrewsService, CrewSeatNotifierService],
  exports: [CrewsService, CrewSeatNotifierService],
})
export class CrewsModule {}
