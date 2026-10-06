import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const YAC_CONFIG_KEY = 'yac';

const DEFAULT_API_URL = 'https://www.yacauctions.com/api';
const DECIMAL_PATTERN = /^\d+(\.\d+)?$/;

export type YacApiSettings = {
	url: string;
	userAgent: string;
	minIntervalMs: number;
	timeoutMs: number;
	maxAttempts: number;
	backoffBaseMs: number;
	maxRetryWaitMs: number;
	maxRequestsPerRun: number;
};

export type YacBounds = {
	maxAuctions: number;
	maxLotsPerAuction: number;
	lotsPageSize: number;
	maxEndRatio: number;
};

export type YacSyncSettings = {
	sourceCurrency: string;
	fxSourceToUsd: string;
	fxUsdToJpy: string;
	fxAsOf: Date;
	sellerName: string;
};

export type YacConfig = {
	api: YacApiSettings;
	bounds: YacBounds;
	enrichDetails: boolean;
	scraper: { enabled: boolean; intervalMs: number };
};

const readPackageVersion = (): string => {
	try {
		const raw = readFileSync(join(process.cwd(), 'package.json'), 'utf8');
		return (JSON.parse(raw) as { version?: string }).version ?? 'unknown';
	} catch {
		return 'unknown';
	}
};

const decimal = () => Joi.string().pattern(DECIMAL_PATTERN);
const positiveDecimal = () =>
	decimal().custom((value: string, helpers) =>
		Number(value) > 0 ? value : helpers.error('any.invalid')
	);

const BaseEnvSchema = Joi.object({
	YAC_API_URL: Joi.string().uri({ scheme: ['http', 'https'] }),
	YAC_USER_AGENT: Joi.string(),
	YAC_MIN_REQUEST_INTERVAL_MS: Joi.number().integer().min(0).default(5000),
	YAC_REQUEST_TIMEOUT_MS: Joi.number().integer().min(1000).default(30000),
	YAC_MAX_ATTEMPTS: Joi.number().integer().min(1).max(10).default(3),
	YAC_BACKOFF_BASE_MS: Joi.number().integer().min(0).default(2000),
	YAC_MAX_RETRY_WAIT_MS: Joi.number().integer().min(0).default(60000),
	YAC_MAX_REQUESTS_PER_RUN: Joi.number().integer().min(1).default(200),
	YAC_MAX_END_RATIO: Joi.number().min(0).max(1).default(0.5),
	YAC_MAX_AUCTIONS: Joi.number().integer().min(1).max(50).default(5),
	YAC_MAX_LOTS_PER_AUCTION: Joi.number()
		.integer()
		.min(1)
		.max(2000)
		.default(500),
	YAC_LOTS_PAGE_SIZE: Joi.number().integer().min(1).max(500).default(100),
	YAC_ENRICH_DETAILS: Joi.boolean().default(false),
	SCRAPER_ENABLED: Joi.boolean().default(false),
	SCRAPER_INTERVAL_MS: Joi.number().integer().min(60000).default(21600000),
	YAC_SOURCE_CURRENCY: Joi.string().length(3).uppercase(),
	YAC_FX_SOURCE_TO_USD: positiveDecimal(),
	YAC_FX_USD_TO_JPY: positiveDecimal(),
	YAC_FX_AS_OF: Joi.date().iso(),
	YAC_SELLER_NAME: Joi.string().max(255),
}).unknown(true);

const SyncEnvSchema = Joi.object({
	YAC_SOURCE_CURRENCY: Joi.string().length(3).uppercase().required(),
	YAC_FX_SOURCE_TO_USD: positiveDecimal().required(),
	YAC_FX_USD_TO_JPY: positiveDecimal().required(),
	YAC_FX_AS_OF: Joi.date().iso().required(),
	YAC_SELLER_NAME: Joi.string().max(255).required(),
}).unknown(true);

const validate = <T>(schema: Joi.ObjectSchema, env: NodeJS.ProcessEnv): T => {
	const { error, value } = schema.validate(env, { abortEarly: false });
	if (error) {
		// Joi messages echo offending values; report only key names and rule types.
		const issues = error.details
			.map((d) => `${d.path.join('.') || 'env'} (${d.type})`)
			.join(', ');
		throw new Error(`Invalid YAC configuration: ${issues}`);
	}
	return value as T;
};

type BaseEnv = {
	YAC_API_URL?: string;
	YAC_USER_AGENT?: string;
	YAC_MIN_REQUEST_INTERVAL_MS: number;
	YAC_REQUEST_TIMEOUT_MS: number;
	YAC_MAX_ATTEMPTS: number;
	YAC_BACKOFF_BASE_MS: number;
	YAC_MAX_RETRY_WAIT_MS: number;
	YAC_MAX_REQUESTS_PER_RUN: number;
	YAC_MAX_END_RATIO: number;
	YAC_MAX_AUCTIONS: number;
	YAC_MAX_LOTS_PER_AUCTION: number;
	YAC_LOTS_PAGE_SIZE: number;
	YAC_ENRICH_DETAILS: boolean;
	SCRAPER_ENABLED: boolean;
	SCRAPER_INTERVAL_MS: number;
	YAC_SOURCE_CURRENCY?: string;
	YAC_FX_SOURCE_TO_USD?: string;
	YAC_FX_USD_TO_JPY?: string;
	YAC_FX_AS_OF?: Date;
	YAC_SELLER_NAME?: string;
};

type SyncEnv = Required<
	Pick<
		BaseEnv,
		| 'YAC_SOURCE_CURRENCY'
		| 'YAC_FX_SOURCE_TO_USD'
		| 'YAC_FX_USD_TO_JPY'
		| 'YAC_FX_AS_OF'
		| 'YAC_SELLER_NAME'
	>
>;

export const loadYacConfig = (
	env: NodeJS.ProcessEnv = process.env
): YacConfig => {
	const v = validate<BaseEnv>(BaseEnvSchema, env);
	return {
		api: {
			url: v.YAC_API_URL ?? DEFAULT_API_URL,
			userAgent:
				v.YAC_USER_AGENT ??
				`CompraLatinoBot/${readPackageVersion()} (academic project)`,
			minIntervalMs: v.YAC_MIN_REQUEST_INTERVAL_MS,
			timeoutMs: v.YAC_REQUEST_TIMEOUT_MS,
			maxAttempts: v.YAC_MAX_ATTEMPTS,
			backoffBaseMs: v.YAC_BACKOFF_BASE_MS,
			maxRetryWaitMs: v.YAC_MAX_RETRY_WAIT_MS,
			maxRequestsPerRun: v.YAC_MAX_REQUESTS_PER_RUN,
		},
		bounds: {
			maxAuctions: v.YAC_MAX_AUCTIONS,
			maxLotsPerAuction: v.YAC_MAX_LOTS_PER_AUCTION,
			lotsPageSize: v.YAC_LOTS_PAGE_SIZE,
			maxEndRatio: v.YAC_MAX_END_RATIO,
		},
		enrichDetails: v.YAC_ENRICH_DETAILS,
		scraper: { enabled: v.SCRAPER_ENABLED, intervalMs: v.SCRAPER_INTERVAL_MS },
	};
};

// Sync-only settings are enforced here, so the read API boots without them.
export const requireSyncSettings = (
	env: NodeJS.ProcessEnv = process.env
): YacSyncSettings => {
	const v = validate<SyncEnv>(SyncEnvSchema, env);
	return {
		sourceCurrency: v.YAC_SOURCE_CURRENCY,
		fxSourceToUsd: v.YAC_FX_SOURCE_TO_USD,
		fxUsdToJpy: v.YAC_FX_USD_TO_JPY,
		fxAsOf: v.YAC_FX_AS_OF,
		sellerName: v.YAC_SELLER_NAME,
	};
};

export const yacConfig = registerAs(YAC_CONFIG_KEY, () => loadYacConfig());
