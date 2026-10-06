import { WsEncryptionAdapter } from '@/adapters/ws-encryption.adapter';
import { setupSwaggerDoc } from '@/config/swagger.config';
import { RABBITMQ_EXCHANGE_TYPE } from '@/constants/rabbitmq';
import { HttpExceptionsFilter } from '@/filters/http-exceptions.filter';
import { EncryptionService } from '@/modules/encryption/encryption.service';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
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

	// Conditionally connect RabbitMQ microservice (inter-service pub/sub)
	const rabbitMqEnabled = process.env.RABBITMQ_ENABLED === 'true';
	if (rabbitMqEnabled)
		app.connectMicroservice<MicroserviceOptions>({
			transport: Transport.RMQ,
			options: {
				urls: [process.env.RABBITMQ_URL],
				queue: process.env.RABBITMQ_QUEUE,
				exchange: process.env.RABBITMQ_EXCHANGE,
				exchangeType: RABBITMQ_EXCHANGE_TYPE,
				wildcards: true,
				queueOptions: { durable: true },
				noAck: false,
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

	// Start microservices if any transport is enabled
	if (tcpEnabled || rabbitMqEnabled) await app.startAllMicroservices();

	await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
