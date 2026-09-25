import { Module } from '@nestjs/common';
import { PracticeModule } from '../practice/index.js';
import { ChallengesController } from './challenges.controller.js';
import { ChallengesService } from './challenges.service.js';

@Module({
  imports: [PracticeModule],
  controllers: [ChallengesController],
  providers: [ChallengesService],
  exports: [ChallengesService],
})
export class ChallengesModule {}
