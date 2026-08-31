import { Module } from '@nestjs/common';
import { AdminOperatorsController } from './operators.controller.js';
import { AdminOperatorsService } from './operators.service.js';

@Module({
  controllers: [AdminOperatorsController],
  providers: [AdminOperatorsService],
})
export class AdminOperatorsModule {}
