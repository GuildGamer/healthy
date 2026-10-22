import { Module } from '@nestjs/common';
import { AccountController } from './account.controller.js';
import { AccountDeletionService } from './account-deletion.service.js';

@Module({
  controllers: [AccountController],
  providers: [AccountDeletionService],
})
export class AccountModule {}
