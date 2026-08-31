import { Module } from '@nestjs/common';
import { AdminTipsController } from './admin-tips.controller.js';
import { AdminTipsService } from './admin-tips.service.js';

@Module({
  controllers: [AdminTipsController],
  providers: [AdminTipsService],
  exports: [AdminTipsService],
})
export class AdminTipsModule {}
