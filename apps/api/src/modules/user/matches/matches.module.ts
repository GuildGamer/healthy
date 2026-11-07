import { Module, forwardRef } from '@nestjs/common';
import { EngagementModule } from '../../shared-modules/engagement/index.js';
import { AnalyticsModule } from '../analytics/index.js';
import { ChallengesModule } from '../challenges/challenges.module.js';
import { CrewsModule } from '../crews/index.js';
import { StreakModule } from '../streak/index.js';
import { BoardMoveNotifierService } from './board-move-notifier.service.js';
import { GroupBoardPushContextService } from './group-board-push-context.service.js';
import { InviteAcceptedNotifierService } from './invite-accepted-notifier.service.js';
import { MatchReactionNotifierService } from './match-reaction-notifier.service.js';
import { MatchReactionsService } from './match-reactions.service.js';
import { MatchSettledNotifierService } from './match-settled-notifier.service.js';
import { MatchesController } from './matches.controller.js';
import { MatchesService } from './matches.service.js';
import { MATCHES_SERVICE } from './matches.tokens.js';

@Module({
  imports: [
    CrewsModule,
    AnalyticsModule,
    EngagementModule,
    StreakModule,
    forwardRef(() => ChallengesModule),
  ],
  controllers: [MatchesController],
  providers: [
    MatchesService,
    { provide: MATCHES_SERVICE, useExisting: MatchesService },
    InviteAcceptedNotifierService,
    GroupBoardPushContextService,
    BoardMoveNotifierService,
    MatchReactionsService,
    MatchReactionNotifierService,
    MatchSettledNotifierService,
  ],
  exports: [MatchesService, MATCHES_SERVICE],
})
export class MatchesModule {}
