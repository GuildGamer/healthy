import { Module } from '@nestjs/common';
import { EnrollmentsModule } from '../enrollments/enrollments.module.js';
import { MeController } from './me.controller.js';
import { MeService } from './me.service.js';

@Module({
  imports: [EnrollmentsModule],
  controllers: [MeController],
  providers: [MeService],
  exports: [MeService],
})
export class MeModule {}
