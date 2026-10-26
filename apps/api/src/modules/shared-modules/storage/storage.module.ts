import { Module } from '@nestjs/common';
import { ENVIRONMENT } from '../config/config.tokens.js';
import type { Environment } from '../config/environment.js';
import { createObjectStorage } from './object-storage.js';
import { OBJECT_STORAGE } from './storage.tokens.js';

@Module({
  providers: [
    {
      provide: OBJECT_STORAGE,
      inject: [ENVIRONMENT],
      useFactory: (environment: Environment) => createObjectStorage(environment.storage),
    },
  ],
  exports: [OBJECT_STORAGE],
})
export class StorageModule {}
