import {
  Global,
  Inject,
  Injectable,
  Module,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { prisma, type PrismaClient } from '@product/db';
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
      useValue: prisma satisfies PrismaClient,
    },
    PrismaShutdownHook,
  ],
  exports: [PRISMA],
})
export class PrismaModule {}
