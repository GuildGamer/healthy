import { Controller, Req } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { ORPCError } from '@orpc/server';
import { Public } from '@thallesp/nestjs-better-auth';
import { appContract } from '@product/contract';
import type { RequestWithAuth } from '../../../shared/types/request-with-auth.js';
import { AccountDeletionService } from './account-deletion.service.js';
import { ACCOUNT_DELETION_REFUSED_MESSAGE } from './constants/account-deletion.js';

@Controller()
@Public()
export class AccountController {
  constructor(private readonly accountDeletion: AccountDeletionService) {}

  @Implement(appContract.deleteAccount)
  deleteAccount(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.deleteAccount).handler(async () => {
      const result = await this.accountDeletion.deleteAccount(user);
      if (!result.success) {
        throw new ORPCError('CONFLICT', {
          message: ACCOUNT_DELETION_REFUSED_MESSAGE,
          data: result.error,
        });
      }

      return result.data;
    });
  }
}
