import { Injectable, Logger } from '@nestjs/common';
import type { YacApiSettings } from '../config/yac.config';
import {
	YacHttpError,
	YacRateLimitedError,
	YacSchemaChangedError,
	YacSourceError,
} from './yac-errors';
import {
	AUCTION_LOTS_QUERY,
	buildAuctionsQuery,
	LOT_DETAIL_QUERY,
} from './yac-queries';
import type {
	YacAuctionLotsData,
	YacAuctionsData,
	YacGraphQlResponse,
	YacLotDetailData,
} from './yac-source.types';

const SCHEMA_CHANGED_CODE = 'GRAPHQL_VALIDATION_FAILED';
const RETRYABLE_STATUS = (status: number): boolean =>
	status === 429 || status >= 500;

const sleep = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));

const EPOCH_MS_THRESHOLD = 1e12;
const EPOCH_SECONDS_THRESHOLD = 1e9;

// ratelimit-reset may be epoch ms, epoch seconds or relative seconds.
const resetToWaitMs = (value: number, now: number): number => {
	if (value > EPOCH_MS_THRESHOLD) return Math.max(0, value - now);
	if (value > EPOCH_SECONDS_THRESHOLD) return Math.max(0, value * 1000 - now);
	return Math.max(0, value * 1000);
};

// Retry-After accepts seconds or an HTTP date.
export const parseWaitMs = (
	headers: Headers,
	now = Date.now()
): number | undefined => {
	const retryAfter = headers.get('retry-after');
	if (retryAfter) {
		const seconds = Number(retryAfter);
		if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
		const date = Date.parse(retryAfter);
		if (!Number.isNaN(date)) return Math.max(0, date - now);
	}
	const resetHeader = headers.get('ratelimit-reset');
	const reset = resetHeader?.trim() ? Number(resetHeader) : Number.NaN;
	return Number.isFinite(reset) ? resetToWaitMs(reset, now) : undefined;
};

@Injectable()
export class YacGraphqlClient {
	private readonly logger = new Logger(YacGraphqlClient.name);
	private lastRequestAt = 0;
	private turn: Promise<void> = Promise.resolve();
	private requests = 0;

	constructor(private readonly settings: YacApiSettings) {}

	get requestCount(): number {
		return this.requests;
	}

	fetchAuctions(pageSize: number): Promise<YacAuctionsData> {
		return this.execute<YacAuctionsData>(buildAuctionsQuery(pageSize), {});
	}

	fetchAuctionLots(
		auctionId: string,
		page: number,
		pageSize: number
	): Promise<YacAuctionLotsData> {
		return this.execute<YacAuctionLotsData>(AUCTION_LOTS_QUERY, {
			auction_id: auctionId,
			pagination: { page, pageSize },
		});
	}

	fetchLotDetail(lotId: string): Promise<YacLotDetailData> {
		return this.execute<YacLotDetailData>(LOT_DETAIL_QUERY, {
			auction_lot_id: lotId,
		});
	}

	private async execute<T>(
		query: string,
		variables: Record<string, unknown>
	): Promise<T> {
		const { maxAttempts, backoffBaseMs, maxRetryWaitMs } = this.settings;
		for (let attempt = 1; ; attempt++) {
			this.assertWithinCap();
			await this.waitForTurn();
			this.assertWithinCap();
			const outcome = await this.send<T>(query, variables);
			if (outcome.kind === 'ok') return outcome.data;
			if (!outcome.retryable) throw outcome.error;
			if (attempt >= maxAttempts)
				throw new YacRateLimitedError(
					`Source unavailable after ${attempt} attempts: ${outcome.error.message}`
				);
			const backoff = backoffBaseMs * 2 ** (attempt - 1);
			const waitMs = Math.max(backoff, outcome.waitMs ?? 0);
			if (waitMs > maxRetryWaitMs)
				throw new YacRateLimitedError(
					`Source asked to wait ${waitMs} ms, above the ${maxRetryWaitMs} ms limit`
				);
			this.logger.warn(
				`Request failed (${outcome.error.message}); retry ${attempt}/${maxAttempts - 1} in ${waitMs} ms`
			);
			await sleep(waitMs);
		}
	}

	private assertWithinCap(): void {
		const { maxRequestsPerRun } = this.settings;
		if (this.requests >= maxRequestsPerRun)
			throw new YacRateLimitedError(
				`Request cap of ${maxRequestsPerRun} per run reached; aborting`
			);
	}

	// Promise-chain mutex: concurrent callers are paced one after another.
	private waitForTurn(): Promise<void> {
		const next = this.turn.then(async () => {
			const wait =
				this.lastRequestAt + this.settings.minIntervalMs - Date.now();
			if (wait > 0) await sleep(wait);
			this.lastRequestAt = Date.now();
		});
		this.turn = next;
		return next;
	}

	private async send<T>(
		query: string,
		variables: Record<string, unknown>
	): Promise<
		| { kind: 'ok'; data: T }
		| {
				kind: 'failed';
				retryable: boolean;
				error: YacSourceError;
				waitMs?: number;
		  }
	> {
		this.requests++;
		let response: Response;
		try {
			response = await fetch(this.settings.url, {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					accept: 'application/json',
					'user-agent': this.settings.userAgent,
				},
				body: JSON.stringify({ query, variables }),
				signal: AbortSignal.timeout(this.settings.timeoutMs),
			});
		} catch (cause) {
			const reason = cause instanceof Error ? cause.name : 'network error';
			return {
				kind: 'failed',
				retryable: true,
				error: new YacSourceError(`Request failed (${reason})`),
			};
		}

		const body = await this.readBody<T>(response);
		const code = body?.errors?.find((e) => e.extensions?.code)?.extensions
			?.code;
		if (code === SCHEMA_CHANGED_CODE)
			return {
				kind: 'failed',
				retryable: false,
				error: new YacSchemaChangedError(
					'Source rejected the query (GRAPHQL_VALIDATION_FAILED); its schema likely changed'
				),
			};
		if (!response.ok)
			return {
				kind: 'failed',
				retryable: RETRYABLE_STATUS(response.status),
				error: new YacHttpError(`HTTP ${response.status}`, response.status),
				waitMs: parseWaitMs(response.headers),
			};
		if (body?.errors?.length || !body?.data)
			return {
				kind: 'failed',
				retryable: false,
				error: new YacSourceError(
					`GraphQL error: ${body?.errors?.[0]?.message ?? 'empty response'}`
				),
			};
		return { kind: 'ok', data: body.data };
	}

	private async readBody<T>(
		response: Response
	): Promise<YacGraphQlResponse<T> | undefined> {
		try {
			return (await response.json()) as YacGraphQlResponse<T>;
		} catch {
			return undefined;
		}
	}
}
