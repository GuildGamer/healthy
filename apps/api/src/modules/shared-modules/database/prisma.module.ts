import { Global, Inject, Injectable, Module, type OnApplicationShutdown } from '@nestjs/common';
import { getPrisma, type PrismaClient } from '@product/db';
import { PRISMA } from './prisma.tokens.js';

@Injectable()
class PrismaShutdownHook implements OnApplicationShutdown {
  constructor(@Inject(PRISMA) private readonly prismaClient: PrismaClient) {}

  async onApplicationShutdown(): Promise<void> {
    await this.prismaClient.$disconnect();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: PRISMA,
      useFactory: (): PrismaClient => getPrisma(),
    },
    PrismaShutdownHook,
  ],
  exports: [PRISMA],
})
export class PrismaModule {}
