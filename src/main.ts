import { WsEncryptionAdapter } from '@/adapters/ws-encryption.adapter';
import { setupSwaggerDoc } from '@/config/swagger.config';
import { HttpExceptionsFilter } from '@/filters/http-exceptions.filter';
import { EncryptionService } from '@/modules/encryption/encryption.service';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule);
	app.set('query parser', 'extended');

	const encryptionService = app.get(EncryptionService);
	app.useWebSocketAdapter(new WsEncryptionAdapter(app, encryptionService));

	// Conditionally connect TCP microservice
	const tcpEnabled = process.env.TCP_ENABLED === 'true';
	if (tcpEnabled)
		app.connectMicroservice({
			transport: Transport.TCP,
			options: {
				host: process.env.TCP_HOST,
				port: process.env.TCP_PORT,
				retryAttempts: process.env.TCP_RETRY_ATTEMPTS,
				retryDelay: process.env.TCP_RETRY_DELAY,
			},
		});

	const { httpAdapter } = app.get(HttpAdapterHost);
	app.useGlobalFilters(new HttpExceptionsFilter(httpAdapter));
	app.useGlobalPipes(new ValidationPipe({ transform: true }));
	app.enableVersioning({
		type: VersioningType.URI,
		prefix: 'v',
	});
	app.setGlobalPrefix('api');
	app.use(cookieParser());
	app.enableCors({
		origin: process.env.CORS_ORIGIN?.split(',') ?? '*',
		credentials: true,
	});
	setupSwaggerDoc(app);

	// Start microservices if TCP is enabled
	if (tcpEnabled) await app.startAllMicroservices();

	await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
