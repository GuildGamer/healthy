import { Module } from '@nestjs/common';
import { AdminAnalyticsController } from './analytics.controller.js';
import { AdminAnalyticsService } from './analytics.service.js';

@Module({
  controllers: [AdminAnalyticsController],
  providers: [AdminAnalyticsService],
})
export class AdminAnalyticsModule {}
