import { Controller, Req } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { Public } from '@thallesp/nestjs-better-auth';
import { appContract } from '@product/contract';
import type { RequestWithAuth } from '../../../shared/types/request-with-auth.js';
import { CameraCountingService } from './camera-counting.service.js';

@Controller()
@Public()
export class CameraCountingController {
  constructor(private readonly cameraCounting: CameraCountingService) {}

  @Implement(appContract.startCameraCounting)
  startCameraCounting(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.startCameraCounting).handler(async ({ input }) => {
      return this.cameraCounting.start(user, input);
    });
  }
}
