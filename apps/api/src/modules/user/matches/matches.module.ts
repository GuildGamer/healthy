import { Module } from '@nestjs/common';
import { PushInfrastructureModule } from '../../shared-modules/push/index.js';
import { AnalyticsModule } from '../analytics/index.js';
import { CrewsModule } from '../crews/index.js';
import { BoardMoveNotifierService } from './board-move-notifier.service.js';
import { InviteAcceptedNotifierService } from './invite-accepted-notifier.service.js';
import { MatchesController } from './matches.controller.js';
import { MatchesService } from './matches.service.js';

@Module({
  imports: [CrewsModule, AnalyticsModule, PushInfrastructureModule],
  controllers: [MatchesController],
  providers: [
    MatchesService,
    InviteAcceptedNotifierService,
    BoardMoveNotifierService,
  ],
  exports: [MatchesService],
})
export class MatchesModule {}
