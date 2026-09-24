import { BullModule, SharedBullAsyncConfiguration } from '@nestjs/bullmq';
import { Logger, Module } from '@nestjs/common';

const useFactory: SharedBullAsyncConfiguration['useFactory'] = async () => {
	const logger = new Logger('BullMqConfig');
	const isQueueEnabled = process.env.QUEUE_ENABLED === 'true';

	if (!isQueueEnabled) {
		logger.warn('Queue is disabled - jobs will not be processed');
		return undefined;
	}

	return {
		connection: {
			host: process.env.REDIS_HOST,
			port: Number(process.env.REDIS_PORT),
			username: process.env.REDIS_USERNAME,
			password: process.env.REDIS_PASSWORD,
			connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT),
			...(process.env.REDIS_TLS === 'true' ? { tls: {} } : {}),
		},
		defaultJobOptions: {
			attempts: Number(process.env.QUEUE_ATTEMPTS) || 3,
			backoff: Number(process.env.QUEUE_BACKOFF) || 2000,
			removeOnComplete: Number(process.env.QUEUE_REMOVE_ON_COMPLETE) || 1000,
			removeOnFail: Number(process.env.QUEUE_REMOVE_ON_FAIL) || 3000,
		},
	};
};

@Module({
	imports: [
		BullModule.forRootAsync({
			useFactory,
		}),
	],
})
export class BullMqConfig {}
