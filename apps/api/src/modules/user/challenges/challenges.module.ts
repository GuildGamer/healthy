import { Module } from '@nestjs/common';
import { PushInfrastructureModule } from '../../shared-modules/push/index.js';
import { PracticeModule } from '../practice/index.js';
import { ChallengesController } from './challenges.controller.js';
import { ChallengesService } from './challenges.service.js';

@Module({
  imports: [PracticeModule, PushInfrastructureModule],
  controllers: [ChallengesController],
  providers: [ChallengesService],
  exports: [ChallengesService],
})
export class ChallengesModule {}
