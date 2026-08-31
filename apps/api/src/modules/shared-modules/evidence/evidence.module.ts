import { Global, Module } from '@nestjs/common';
import { ENVIRONMENT } from '../config/config.tokens.js';
import type { Environment } from '../config/environment.js';
import { createEvidenceValidator } from './evidence-validator.js';
import { EVIDENCE_VALIDATOR } from './evidence.tokens.js';

@Global()
@Module({
  providers: [
    {
      provide: EVIDENCE_VALIDATOR,
      inject: [ENVIRONMENT],
      useFactory: (environment: Environment) =>
        createEvidenceValidator(environment.evidenceVision),
    },
  ],
  exports: [EVIDENCE_VALIDATOR],
})
export class EvidenceModule {}
