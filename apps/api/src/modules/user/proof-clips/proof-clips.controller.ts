import { Controller, Req } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { Public } from '@thallesp/nestjs-better-auth';
import { appContract } from '@product/contract';
import type { RequestWithAuth } from '../../../shared/types/request-with-auth.js';
import { ProofClipsService } from './proof-clips.service.js';

@Controller()
/** Most handlers still require a session via `requireUser`; only publicVerify is anonymous. */
@Public()
export class ProofClipsController {
  constructor(private readonly proofClipsService: ProofClipsService) {}

  @Implement(appContract.reserveProofClip)
  reserveProofClip(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.reserveProofClip).handler(async ({ input }) => {
      return this.proofClipsService.reserve(user, input);
    });
  }

  @Implement(appContract.recordProofClip)
  recordProofClip(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.recordProofClip).handler(async ({ input }) => {
      return this.proofClipsService.record(user, input);
    });
  }

  @Implement(appContract.requestProofClipUpload)
  requestProofClipUpload(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.requestProofClipUpload).handler(async ({ input }) => {
      return this.proofClipsService.requestUpload(user, input);
    });
  }

  @Implement(appContract.completeProofClipUpload)
  completeProofClipUpload(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.completeProofClipUpload).handler(async ({ input }) => {
      return this.proofClipsService.completeUpload(user, input);
    });
  }

  @Implement(appContract.getProofClip)
  getProofClip(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.getProofClip).handler(async ({ input }) => {
      return this.proofClipsService.get(user, input.clipId);
    });
  }

  @Implement(appContract.listMatchProofClips)
  listMatchProofClips(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.listMatchProofClips).handler(async ({ input }) => {
      return this.proofClipsService.listForMatch(user, input);
    });
  }

  @Implement(appContract.verifyProofCode)
  verifyProofCode(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.verifyProofCode).handler(async ({ input }) => {
      return this.proofClipsService.verify(user, input.code);
    });
  }

  /** Anonymous on purpose: website visitors verify shared clips without signing in. */
  @Implement(appContract.publicVerifyProofCode)
  publicVerifyProofCode(@Req() request: RequestWithAuth) {
    const clientKey = request.ip?.trim() || 'unknown';
    return implement(appContract.publicVerifyProofCode).handler(async ({ input }) => {
      return this.proofClipsService.verifyPublic(input.code, clientKey);
    });
  }

  @Implement(appContract.removeProofClip)
  removeProofClip(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.removeProofClip).handler(async ({ input }) => {
      return this.proofClipsService.remove(user, input.clipId);
    });
  }

  @Implement(appContract.reportProofClip)
  reportProofClip(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.reportProofClip).handler(async ({ input }) => {
      return this.proofClipsService.report(user, input);
    });
  }

  @Implement(appContract.blockUser)
  blockUser(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.blockUser).handler(async ({ input }) => {
      return this.proofClipsService.block(user, input.userId);
    });
  }

  @Implement(appContract.unblockUser)
  unblockUser(@Req() request: RequestWithAuth) {
    const user = request.user ?? null;
    return implement(appContract.unblockUser).handler(async ({ input }) => {
      return this.proofClipsService.unblock(user, input.userId);
    });
  }
}
