import { Module } from '@nestjs/common';
import { ChallengesModule } from '../challenges/challenges.module.js';
import { MeModule } from '../me/me.module.js';
import { TodayController } from './today.controller.js';
import { TodayService } from './today.service.js';

@Module({
  imports: [MeModule, ChallengesModule],
  controllers: [TodayController],
  providers: [TodayService],
  exports: [TodayService],
})
export class TodayModule {}
