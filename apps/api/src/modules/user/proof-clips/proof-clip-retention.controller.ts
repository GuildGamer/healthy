import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Public } from '@thallesp/nestjs-better-auth';
import { InternalSecretGuard } from '../../shared-modules/engagement/dispatch/internal-secret.guard.js';
import {
  ProofClipRetentionService,
  type ProofClipSweepSummary,
} from './proof-clip-retention.service.js';

@Controller('internal/proof-clips')
export class ProofClipRetentionController {
  constructor(private readonly retention: ProofClipRetentionService) {}

  @Public()
  @UseGuards(InternalSecretGuard)
  @Post('sweep')
  @HttpCode(200)
  async sweep(): Promise<ProofClipSweepSummary> {
    return this.retention.sweep();
  }
}
