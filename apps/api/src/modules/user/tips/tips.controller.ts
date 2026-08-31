import { Controller } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { Public } from '@thallesp/nestjs-better-auth';
import { appContract } from '@product/contract';
import { TipsService } from './tips.service.js';

@Controller()
@Public()
export class TipsController {
  constructor(private readonly tips: TipsService) {}

  @Implement(appContract.listTips)
  listTips() {
    return implement(appContract.listTips).handler(async () => {
      return this.tips.listActive();
    });
  }
}
