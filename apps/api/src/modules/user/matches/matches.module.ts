import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/index.js';
import { CrewsModule } from '../crews/index.js';
import { MatchesController } from './matches.controller.js';
import { MatchesService } from './matches.service.js';

@Module({
  imports: [CrewsModule, AnalyticsModule],
  controllers: [MatchesController],
  providers: [MatchesService],
  exports: [MatchesService],
})
export class MatchesModule {}
