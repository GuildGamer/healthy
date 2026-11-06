import { Module } from '@nestjs/common';
import { ConfigModule } from '../../shared-modules/config/index.js';
import { EnrollmentsModule } from '../enrollments/enrollments.module.js';
import { MeController } from './me.controller.js';
import { MeService } from './me.service.js';

@Module({
  imports: [ConfigModule, EnrollmentsModule],
  controllers: [MeController],
  providers: [MeService],
  exports: [MeService],
})
export class MeModule {}
