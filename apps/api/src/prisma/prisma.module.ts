import { Global, Module } from '@nestjs/common';
import { prisma, type PrismaClient } from '@product/db';
import { PRISMA } from './prisma.tokens.js';

@Global()
@Module({
  providers: [
    {
      provide: PRISMA,
      useValue: prisma satisfies PrismaClient,
    },
  ],
  exports: [PRISMA],
})
export class PrismaModule {}
