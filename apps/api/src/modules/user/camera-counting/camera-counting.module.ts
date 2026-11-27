import { Module } from '@nestjs/common';
import { CameraCountingController } from './camera-counting.controller.js';
import { CameraCountingService } from './camera-counting.service.js';

@Module({
  controllers: [CameraCountingController],
  providers: [CameraCountingService],
  exports: [CameraCountingService],
})
export class CameraCountingModule {}
