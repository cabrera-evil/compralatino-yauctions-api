import { AppConfig } from '@/config/app.config';
import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtConfig } from './config/jwt.config';
import { ThrottlerGuard } from './guards/throttler.guard';
import { AuditLogInterceptor } from './interceptors/audit-log.interceptor';
import { EncryptionInterceptor } from './interceptors/encryption.interceptor';
import { RpcEncryptionInterceptor } from './interceptors/rpc-encryption.interceptor';
import { TokenRefreshInterceptor } from './interceptors/token-refresh.interceptor';
import { ApiKeyModule } from './modules/api-key/api-key.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { AuditLogService } from './modules/audit-log/audit-log.service';
import { AuthModule } from './modules/auth/auth.module';
import { CloudinaryModule } from './modules/cloudinary/cloudinary.module';
import { EncryptionModule } from './modules/encryption/encryption.module';
import { FileModule } from './modules/file/file.module';
import { HealthModule } from './modules/health/health.module';
import { PdfModule } from './modules/pdf/pdf.module';
import { PermissionModule } from './modules/permission/permission.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { RoleModule } from './modules/role/role.module';
import { SocketModule } from './modules/socket/socket.module';
import { UserModule } from './modules/user/user.module';

@Module({
	imports: [
		AppConfig,
		ApiKeyModule,
		AuditLogModule,
		AuthModule,
		CloudinaryModule,
		EncryptionModule,
		FileModule,
		HealthModule,
		PermissionModule,
		PdfModule,
		PrismaModule,
		RoleModule,
		UserModule,
		SocketModule,
		JwtModule.registerAsync(JwtConfig),
	],
	controllers: [AppController],
	providers: [
		AppService,
		AuditLogService,
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
		{
			provide: APP_INTERCEPTOR,
			useClass: AuditLogInterceptor,
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: TokenRefreshInterceptor,
		},
	],
})
export class AppModule {}
