import { Module } from '@nestjs/common';
import { EngagementModule } from '../../shared-modules/engagement/index.js';
import { AnalyticsModule } from '../analytics/index.js';
import { ChallengesModule } from '../challenges/index.js';
import { CrewsModule } from '../crews/index.js';
import { StreakModule } from '../streak/index.js';
import { BoardMoveNotifierService } from './board-move-notifier.service.js';
import { InviteAcceptedNotifierService } from './invite-accepted-notifier.service.js';
import { MatchReactionNotifierService } from './match-reaction-notifier.service.js';
import { MatchReactionsService } from './match-reactions.service.js';
import { MatchSettledNotifierService } from './match-settled-notifier.service.js';
import { MatchesController } from './matches.controller.js';
import { MatchesService } from './matches.service.js';

@Module({
  imports: [CrewsModule, AnalyticsModule, EngagementModule, StreakModule, ChallengesModule],
  controllers: [MatchesController],
  providers: [
    MatchesService,
    InviteAcceptedNotifierService,
    BoardMoveNotifierService,
    MatchReactionsService,
    MatchReactionNotifierService,
    MatchSettledNotifierService,
  ],
  exports: [MatchesService],
})
export class MatchesModule {}
