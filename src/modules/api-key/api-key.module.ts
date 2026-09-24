import { ApiKeyAuthGuard } from '@/guards/api-key-auth.guard';
import { RpcAuthGuard } from '@/guards/rpc-auth.guard';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { UserModule } from '@/modules/user/user.module';
import { Module } from '@nestjs/common';
import { ApiKeyController } from './api-key.controller';
import { ApiKeyService } from './api-key.service';

@Module({
	imports: [PrismaModule, UserModule],
	controllers: [ApiKeyController],
	providers: [ApiKeyService, ApiKeyAuthGuard, JwtAuthGuard, RpcAuthGuard],
	exports: [ApiKeyService, ApiKeyAuthGuard, RpcAuthGuard],
})
export class ApiKeyModule {}
