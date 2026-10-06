declare namespace NodeJS {
	interface ProcessEnv {
		NODE_ENV: 'development' | 'production' | 'test' | 'staging';
		FRONTEND_URL: string;
		PORT?: string;
		CORS_ORIGIN?: string;

		TCP_ENABLED?: 'true' | 'false';
		TCP_HOST?: string;
		TCP_PORT?: string;
		TCP_RETRY_ATTEMPTS?: string;
		TCP_RETRY_DELAY?: string;

		RABBITMQ_ENABLED?: 'true' | 'false';
		RABBITMQ_URL?: string;
		RABBITMQ_EXCHANGE?: string;
		RABBITMQ_QUEUE?: string;

		JWT_SECRET: string;
		REFRESH_TOKEN_SECRET: string;
		API_KEYS: string;
		SALT_ROUNDS?: string;
		PUPPETEER_EXECUTABLE_PATH?: string;

		ENCRYPTION_ENABLED?: 'true' | 'false';
		ENCRYPTION_PASSPHRASE?: string;
		DECRYPTION_PASSPHRASE?: string;

		CACHE_ENABLED?: 'true' | 'false';
		CACHE_STORE: 'memory' | 'redis';
		CACHE_TTL: string;

		QUEUE_ENABLED?: 'true' | 'false';
		QUEUE_ATTEMPTS: string;
		QUEUE_BACKOFF: string;
		QUEUE_REMOVE_ON_COMPLETE: string;
		QUEUE_REMOVE_ON_FAIL: string;

		THROTTLE_ENABLED?: 'true' | 'false';
		THROTTLE_STORAGE?: 'memory' | 'redis';
		THROTTLE_SHORT_TTL?: string;
		THROTTLE_SHORT_LIMIT?: string;
		THROTTLE_MEDIUM_TTL?: string;
		THROTTLE_MEDIUM_LIMIT?: string;
		THROTTLE_LONG_TTL?: string;
		THROTTLE_LONG_LIMIT?: string;
		THROTTLE_TRUST_PROXY?: 'true' | 'false';
		THROTTLE_PROXY_DEPTH?: string;

		DATABASE_URL: string;

		REDIS_HOST?: string;
		REDIS_PORT?: string;
		REDIS_USERNAME?: string;
		REDIS_PASSWORD?: string;
		REDIS_TLS?: 'true' | 'false';
		REDIS_CONNECT_TIMEOUT?: string;

		ADMIN_USERNAME?: string;
		ADMIN_FIRSTNAME?: string;
		ADMIN_LASTNAME?: string;
		ADMIN_EMAIL?: string;
		ADMIN_PASSWORD?: string;

		SMTP_HOST: string;
		SMTP_PORT: string;
		SMTP_IGNORE_TLS?: 'true' | 'false';
		SMTP_SECURE?: 'true' | 'false';
		SMTP_USERNAME: string;
		SMTP_PASSWORD: string;
		SMTP_DEFAULT_FROM: string;
		SMTP_DEFAULT_REPLY_TO: string;

		CLOUDINARY_CLOUD_NAME: string;
		CLOUDINARY_API_KEY: string;
		CLOUDINARY_API_SECRET: string;

		GOOGLE_CLIENT_ID: string;
		GOOGLE_CLIENT_SECRET: string;
		GOOGLE_CALLBACK_PATH: string;
	}
}
