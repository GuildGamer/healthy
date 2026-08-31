import { Module } from '@nestjs/common';
import { AdminMembersController } from './members.controller.js';
import { AdminMembersService } from './members.service.js';

@Module({
  controllers: [AdminMembersController],
  providers: [AdminMembersService],
})
export class AdminMembersModule {}
