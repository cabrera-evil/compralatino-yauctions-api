import {
	CacheInterceptor,
	CacheModule,
	CacheModuleAsyncOptions,
} from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { redisStore } from 'cache-manager-redis-store';

const useCacheConfig: CacheModuleAsyncOptions['useFactory'] = async () => {
	const isRedis = process.env.CACHE_STORE === 'redis';
	const ttl = Number(process.env.CACHE_TTL ?? 0);
	if (isRedis) {
		return {
			isGlobal: true,
			store: await redisStore({
				username: process.env.REDIS_USERNAME,
				password: process.env.REDIS_PASSWORD,
				ttl,
				socket: {
					host: process.env.REDIS_HOST,
					port: Number(process.env.REDIS_PORT),
					...(process.env.REDIS_TLS === 'true' ? { tls: {} } : {}),
				},
			}),
		};
	}
	return { isGlobal: true, ttl };
};

const isCacheEnabled = process.env.CACHE_ENABLED === 'true';

@Module({
	imports: isCacheEnabled
		? [CacheModule.registerAsync({ useFactory: useCacheConfig })]
		: [],
	providers: isCacheEnabled
		? [{ provide: APP_INTERCEPTOR, useClass: CacheInterceptor }]
		: [],
})
export class CacheConfig {}
