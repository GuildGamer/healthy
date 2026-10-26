import { Module } from '@nestjs/common';
import { StorageModule } from '../../shared-modules/storage/index.js';
import { ProofClipRetentionController } from './proof-clip-retention.controller.js';
import { ProofClipRetentionService } from './proof-clip-retention.service.js';
import { ProofClipsController } from './proof-clips.controller.js';
import { ProofClipsService } from './proof-clips.service.js';

@Module({
  imports: [StorageModule],
  controllers: [ProofClipsController, ProofClipRetentionController],
  providers: [ProofClipsService, ProofClipRetentionService],
  exports: [ProofClipsService],
})
export class ProofClipsModule {}
