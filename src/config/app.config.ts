import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { BullMqConfig } from './bullmq.config';
import { CacheConfig } from './cache.config';
import { CronConfig } from './cron.config';
import { EnvironmentConfig } from './enviroment.config';
import { JwtConfig } from './jwt.config';
import { MailConfig } from './mail.config';
import { RabbitMqConfig } from './rabbitmq.config';
import { ThrottlerConfig } from './throttler.config';

@Module({
	imports: [
		BullMqConfig,
		CacheConfig,
		CronConfig,
		EnvironmentConfig,
		MailConfig,
		RabbitMqConfig,
		ThrottlerConfig,
		JwtModule.registerAsync(JwtConfig),
	],
	exports: [RabbitMqConfig],
})
export class AppConfig {}
