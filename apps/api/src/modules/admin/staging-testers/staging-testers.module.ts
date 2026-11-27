import { Module } from '@nestjs/common';
import { AdminStagingTestersController } from './staging-testers.controller.js';
import { AdminStagingTestersService } from './staging-testers.service.js';

@Module({
  controllers: [AdminStagingTestersController],
  providers: [AdminStagingTestersService],
  exports: [AdminStagingTestersService],
})
export class AdminStagingTestersModule {}
