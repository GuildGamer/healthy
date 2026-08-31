import { Controller, Req } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { adminContract } from '@product/contract';
import type { RequestWithAuth } from '../../../shared/types/request-with-auth.js';
import { AdminAuth } from '../../shared-modules/auth/admin.decorators.js';
import { AdminMembersService } from './members.service.js';

@Controller()
@AdminAuth('support')
export class AdminMembersController {
  constructor(private readonly members: AdminMembersService) {}

  @Implement(adminContract.listMembers)
  listMembers(@Req() request: RequestWithAuth) {
    const admin = request.admin ?? null;
    return implement(adminContract.listMembers).handler(async ({ input }) => {
      return this.members.list(admin, input.query);
    });
  }

  @Implement(adminContract.lookupMember)
  lookupMember(@Req() request: RequestWithAuth) {
    const admin = request.admin ?? null;
    return implement(adminContract.lookupMember).handler(async ({ input }) => {
      return this.members.lookup(admin, input.email);
    });
  }

  @Implement(adminContract.adjustMemberPoints)
  adjustMemberPoints(@Req() request: RequestWithAuth) {
    const admin = request.admin ?? null;
    return implement(adminContract.adjustMemberPoints).handler(async ({ input }) => {
      return this.members.adjustPoints(admin, input);
    });
  }

  @Implement(adminContract.setMemberActive)
  setMemberActive(@Req() request: RequestWithAuth) {
    const admin = request.admin ?? null;
    return implement(adminContract.setMemberActive).handler(async ({ input }) => {
      return this.members.setActive(admin, input);
    });
  }
}
