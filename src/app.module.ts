import { AppConfig } from '@/config/app.config';
import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ThrottlerGuard } from './guards/throttler.guard';
import { EncryptionInterceptor } from './interceptors/encryption.interceptor';
import { RpcEncryptionInterceptor } from './interceptors/rpc-encryption.interceptor';
import { CloudinaryModule } from './modules/cloudinary/cloudinary.module';
import { EncryptionModule } from './modules/encryption/encryption.module';
import { HealthModule } from './modules/health/health.module';
import { PdfModule } from './modules/pdf/pdf.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { YauctionsRpcModule } from './modules/yauctions-rpc/yauctions-rpc.module';
import { YauctionsModule } from './modules/yauctions/yauctions.module';

@Module({
	imports: [
		AppConfig,
		CloudinaryModule,
		EncryptionModule,
		HealthModule,
		PdfModule,
		PrismaModule,
		YauctionsModule,
		YauctionsRpcModule,
	],
	controllers: [AppController],
	providers: [
		AppService,
		{
			provide: APP_GUARD,
			useClass: ThrottlerGuard,
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: EncryptionInterceptor,
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: RpcEncryptionInterceptor,
		},
	],
})
export class AppModule {}
