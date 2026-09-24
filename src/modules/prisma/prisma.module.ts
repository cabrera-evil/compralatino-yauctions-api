import { Global, Module } from '@nestjs/common';
import { PrismaClient } from 'prisma/generated/client';
import { PrismaProvider, PrismaShutdown } from './prisma.service';

@Global()
@Module({
	providers: [PrismaProvider, PrismaShutdown],
	exports: [PrismaClient],
})
export class PrismaModule {}
