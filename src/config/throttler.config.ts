import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler';
import Redis from 'ioredis';

const useThrottlerConfig: () => ThrottlerModuleOptions = () => {
	const isRedis = process.env.THROTTLE_STORAGE === 'redis';
	const config: ThrottlerModuleOptions = {
		throttlers: [
			{
				name: 'short',
				ttl: Number(process.env.THROTTLE_SHORT_TTL ?? 1000),
				limit: Number(process.env.THROTTLE_SHORT_LIMIT ?? 10),
			},
			{
				name: 'medium',
				ttl: Number(process.env.THROTTLE_MEDIUM_TTL ?? 60000),
				limit: Number(process.env.THROTTLE_MEDIUM_LIMIT ?? 100),
			},
			{
				name: 'long',
				ttl: Number(process.env.THROTTLE_LONG_TTL ?? 3600000),
				limit: Number(process.env.THROTTLE_LONG_LIMIT ?? 1000),
			},
		],
	};

	if (isRedis) {
		config.storage = new ThrottlerStorageRedisService(
			new Redis({
				host: process.env.REDIS_HOST,
				port: Number(process.env.REDIS_PORT),
				username: process.env.REDIS_USERNAME,
				password: process.env.REDIS_PASSWORD,
				connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT),
				...(process.env.REDIS_TLS === 'true' ? { tls: {} } : {}),
			})
		);
	}

	return config;
};

const isThrottleEnabled = process.env.THROTTLE_ENABLED === 'true';

@Module({
	imports: isThrottleEnabled
		? [ThrottlerModule.forRoot(useThrottlerConfig())]
		: [],
})
export class ThrottlerConfig {}
