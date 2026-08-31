import { Controller, Req } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { Public } from '@thallesp/nestjs-better-auth';
import { appContract } from '@product/contract';
import type { RequestWithAuth } from '../../../shared/types/request-with-auth.js';
import { PushDevicesService } from '../../shared-modules/push/push-devices.service.js';

@Controller()
@Public()
export class PushDevicesController {
  constructor(private readonly pushDevicesService: PushDevicesService) {}

  @Implement(appContract.registerPushDevice)
  registerPushDevice(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.registerPushDevice).handler(
      async ({ input }) => {
        return this.pushDevicesService.register(
          user,
          input.expoPushToken,
          input.platform,
        );
      },
    );
  }

  @Implement(appContract.unregisterPushDevice)
  unregisterPushDevice(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.unregisterPushDevice).handler(
      async ({ input }) => {
        return this.pushDevicesService.unregister(user, input.expoPushToken);
      },
    );
  }
}
