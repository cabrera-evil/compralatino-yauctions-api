import * as Joi from 'joi';

export const EnvironmentSchema = Joi.object({
	NODE_ENV: Joi.string()
		.valid('development', 'production', 'test', 'staging')
		.default('development'),
	FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),
	PORT: Joi.number().integer().min(1).max(65535).default(3000),

	TCP_ENABLED: Joi.boolean().default(false),
	TCP_HOST: Joi.alternatives()
		.try(
			Joi.string().ip({ version: ['ipv4', 'ipv6'] }),
			Joi.string().hostname()
		)
		.default('0.0.0.0'),
	TCP_PORT: Joi.number().integer().min(1).max(65535).default(4010),
	TCP_RETRY_ATTEMPTS: Joi.number().integer().min(0).default(5),
	TCP_RETRY_DELAY: Joi.number().integer().min(0).default(2000),

	CORS_ORIGIN: Joi.string().optional(),

	JWT_SECRET: Joi.string().required(),
	REFRESH_TOKEN_SECRET: Joi.string().required(),
	API_KEYS: Joi.string().min(20).required(),
	SALT_ROUNDS: Joi.number().integer().min(4).max(31).default(10),

	ENCRYPTION_ENABLED: Joi.boolean().default(false),
	ENCRYPTION_PASSPHRASE: Joi.string().min(32).when('ENCRYPTION_ENABLED', {
		is: true,
		then: Joi.required(),
		otherwise: Joi.optional(),
	}),
	DECRYPTION_PASSPHRASE: Joi.string().min(32).when('ENCRYPTION_ENABLED', {
		is: true,
		then: Joi.required(),
		otherwise: Joi.optional(),
	}),

	CACHE_ENABLED: Joi.boolean().default(true),
	CACHE_STORE: Joi.string().valid('memory', 'redis').default('memory'),
	CACHE_TTL: Joi.number().integer().min(0).optional(),

	QUEUE_ENABLED: Joi.boolean().default(false),
	QUEUE_ATTEMPTS: Joi.number().integer().min(0).default(3),
	QUEUE_BACKOFF: Joi.number().integer().min(0).default(2000),
	QUEUE_REMOVE_ON_COMPLETE: Joi.number().integer().min(0).default(1000),
	QUEUE_REMOVE_ON_FAIL: Joi.number().integer().min(0).default(3000),

	DATABASE_URL: Joi.string().uri().required(),

	REDIS_HOST: Joi.string()
		.when('CACHE_STORE', {
			is: 'redis',
			then: Joi.required(),
			otherwise: Joi.optional(),
		})
		.when('THROTTLE_STORAGE', {
			is: 'redis',
			then: Joi.required(),
			otherwise: Joi.optional(),
		}),
	REDIS_PORT: Joi.number()
		.integer()
		.min(0)
		.when('CACHE_STORE', {
			is: 'redis',
			then: Joi.required(),
			otherwise: Joi.optional(),
		})
		.when('THROTTLE_STORAGE', {
			is: 'redis',
			then: Joi.required(),
			otherwise: Joi.optional(),
		}),
	REDIS_USERNAME: Joi.string()
		.when('CACHE_STORE', {
			is: 'redis',
			then: Joi.required(),
			otherwise: Joi.optional(),
		})
		.when('THROTTLE_STORAGE', {
			is: 'redis',
			then: Joi.required(),
			otherwise: Joi.optional(),
		}),
	REDIS_PASSWORD: Joi.string()
		.when('CACHE_STORE', {
			is: 'redis',
			then: Joi.required(),
			otherwise: Joi.optional(),
		})
		.when('THROTTLE_STORAGE', {
			is: 'redis',
			then: Joi.required(),
			otherwise: Joi.optional(),
		}),
	REDIS_TLS: Joi.boolean()
		.when('CACHE_STORE', {
			is: 'redis',
			then: Joi.required(),
			otherwise: Joi.optional(),
		})
		.when('THROTTLE_STORAGE', {
			is: 'redis',
			then: Joi.required(),
			otherwise: Joi.optional(),
		}),
	REDIS_CONNECT_TIMEOUT: Joi.number().integer().min(0).optional(),

	THROTTLE_ENABLED: Joi.boolean().default(true),
	THROTTLE_STORAGE: Joi.string().valid('memory', 'redis').default('memory'),
	THROTTLE_SHORT_TTL: Joi.number().integer().min(1).default(1000),
	THROTTLE_SHORT_LIMIT: Joi.number().integer().min(1).default(10),
	THROTTLE_MEDIUM_TTL: Joi.number().integer().min(1).default(60000),
	THROTTLE_MEDIUM_LIMIT: Joi.number().integer().min(1).default(100),
	THROTTLE_LONG_TTL: Joi.number().integer().min(1).default(3600000),
	THROTTLE_LONG_LIMIT: Joi.number().integer().min(1).default(1000),
	THROTTLE_TRUST_PROXY: Joi.boolean().default(false),
	THROTTLE_PROXY_DEPTH: Joi.number().integer().min(0).default(1),

	ADMIN_USERNAME: Joi.string().alphanum().min(3).max(30).optional(),
	ADMIN_FIRSTNAME: Joi.string().optional(),
	ADMIN_LASTNAME: Joi.string().optional(),
	ADMIN_EMAIL: Joi.string().email().optional(),
	ADMIN_PASSWORD: Joi.string().optional(),

	SMTP_HOST: Joi.string().required(),
	SMTP_PORT: Joi.number().integer().min(0).required(),
	SMTP_IGNORE_TLS: Joi.boolean().optional(),
	SMTP_SECURE: Joi.boolean().optional(),
	SMTP_USERNAME: Joi.string().required(),
	SMTP_PASSWORD: Joi.string().required(),
	SMTP_DEFAULT_FROM: Joi.string().email().required(),
	SMTP_DEFAULT_REPLY_TO: Joi.string().email().required(),

	CLOUDINARY_CLOUD_NAME: Joi.string().required(),
	CLOUDINARY_API_KEY: Joi.string().required(),
	CLOUDINARY_API_SECRET: Joi.string().required(),

	GOOGLE_CLIENT_ID: Joi.string().required(),
	GOOGLE_CLIENT_SECRET: Joi.string().required(),
	GOOGLE_CALLBACK_PATH: Joi.string().required(),

	PUPPETEER_EXECUTABLE_PATH: Joi.string().optional(),
});
