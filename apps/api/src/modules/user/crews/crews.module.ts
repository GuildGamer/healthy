import { Module } from '@nestjs/common';
import { EngagementModule } from '../../shared-modules/engagement/index.js';
import { CrewSeatNotifierService } from './crew-seat-notifier.service.js';
import { CrewsController } from './crews.controller.js';
import { CrewsService } from './crews.service.js';

@Module({
  imports: [EngagementModule],
  controllers: [CrewsController],
  providers: [CrewsService, CrewSeatNotifierService],
  exports: [CrewsService, CrewSeatNotifierService],
})
export class CrewsModule {}
