import { Module } from '@nestjs/common';
import { AdminMeController } from './admin-me.controller.js';
import { AdminMeService } from './admin-me.service.js';

@Module({
  controllers: [AdminMeController],
  providers: [AdminMeService],
})
export class AdminMeModule {}
