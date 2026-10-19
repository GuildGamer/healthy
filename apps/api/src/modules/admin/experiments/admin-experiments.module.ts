import { Module } from '@nestjs/common';
import { AdminExperimentsController } from './admin-experiments.controller.js';
import { AdminExperimentsService } from './admin-experiments.service.js';

@Module({
  controllers: [AdminExperimentsController],
  providers: [AdminExperimentsService],
})
export class AdminExperimentsModule {}
