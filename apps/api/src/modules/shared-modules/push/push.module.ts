import { Module } from '@nestjs/common';
import { ExpoPushSender } from './expo-push-sender.js';
import { PushDevicesService } from './push-devices.service.js';
import { PUSH_SENDER } from './push-sender.js';

@Module({
  providers: [
    PushDevicesService,
    {
      provide: PUSH_SENDER,
      useClass: ExpoPushSender,
    },
  ],
  exports: [PushDevicesService, PUSH_SENDER],
})
export class PushInfrastructureModule {}
