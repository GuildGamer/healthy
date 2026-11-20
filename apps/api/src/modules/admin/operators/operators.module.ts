import { Module } from '@nestjs/common';
import { MailModule } from '../../shared-modules/mail/mail.module.js';
import { AdminOperatorsController } from './operators.controller.js';
import { AdminOperatorsService } from './operators.service.js';

@Module({
  imports: [MailModule],
  controllers: [AdminOperatorsController],
  providers: [AdminOperatorsService],
})
export class AdminOperatorsModule {}
