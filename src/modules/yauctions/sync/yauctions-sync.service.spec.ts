import { Logger } from '@nestjs/common';
import { type YacConfig } from '../config/yac.config';
import {
	YacHttpError,
	YacRateLimitedError,
	YacSourceError,
} from '../source/yac-errors';
import { YauctionsSyncService } from './yauctions-sync.service';

const SYNC_ENV = {
	YAC_SOURCE_CURRENCY: 'USD',
	YAC_FX_SOURCE_TO_USD: '1',
	YAC_FX_USD_TO_JPY: '150',
	YAC_FX_AS_OF: '2026-10-01T00:00:00Z',
	YAC_SELLER_NAME: 'Test Seller',
};

const config: YacConfig = {
	api: {
		url: 'http://yac.invalid/api',
		userAgent: 'test-agent',
		minIntervalMs: 0,
		timeoutMs: 1000,
		maxAttempts: 1,
		backoffBaseMs: 0,
		maxRetryWaitMs: 0,
		maxRequestsPerRun: 10,
	},
	bounds: {
		maxAuctions: 5,
		maxLotsPerAuction: 10,
		lotsPageSize: 10,
		maxEndRatio: 0.5,
	},
	enrichDetails: false,
	scraper: { enabled: false, intervalMs: 60000 },
};

const jsonResponse = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' },
	});

describe('YauctionsSyncService', () => {
	const savedEnv = process.env;
	const savedFetch = global.fetch;
	let fetchMock: jest.Mock;
	let repository: { loadCategoryCodes: jest.Mock; persist: jest.Mock };
	let service: YauctionsSyncService;

	beforeEach(() => {
		jest.resetAllMocks();
		jest.spyOn(Logger.prototype, 'log').mockImplementation();
		jest.spyOn(Logger.prototype, 'warn').mockImplementation();
		process.env = { ...savedEnv, ...SYNC_ENV };
		fetchMock = jest.fn();
		global.fetch = fetchMock as never;
		repository = {
			loadCategoryCodes: jest.fn().mockResolvedValue([]),
			persist: jest.fn(),
		};
		service = new YauctionsSyncService(config, repository as never);
	});

	afterEach(() => {
		process.env = savedEnv;
		global.fetch = savedFetch;
	});

	it('dry-run reports an empty listing without touching the repository', async () => {
		fetchMock.mockResolvedValue(
			jsonResponse({ data: { auctions: { auctions: [], total: 0 } } })
		);
		const report = await service.run({ apply: false });
		expect(report).toMatchObject({
			mode: 'dry-run',
			auctionsListed: 0,
			lotsMapped: 0,
			requests: 1,
			auctionListComplete: false,
		});
		expect(report.persisted).toBeUndefined();
		expect(repository.persist).not.toHaveBeenCalled();
		expect(service.isRunning).toBe(false);
	});

	it('apply mode persists the collected result', async () => {
		fetchMock.mockResolvedValue(
			jsonResponse({ data: { auctions: { auctions: [], total: 0 } } })
		);
		const summary = {
			categories: 0,
			auctions: 0,
			lotsUpserted: 0,
			lotsEnded: 0,
		};
		repository.persist.mockResolvedValue(summary);
		const report = await service.run({ apply: true });
		expect(repository.loadCategoryCodes).toHaveBeenCalled();
		expect(repository.persist).toHaveBeenCalledTimes(1);
		expect(report).toMatchObject({ mode: 'apply', persisted: summary });
	});

	it('rejects apply without a repository', async () => {
		const noRepo = new YauctionsSyncService(config);
		await expect(noRepo.run({ apply: true })).rejects.toThrow(
			'Applying a sync requires a database repository'
		);
	});

	it('rejects a concurrent run and releases the flag afterwards', async () => {
		let release!: (r: Response) => void;
		fetchMock.mockReturnValueOnce(
			new Promise<Response>((resolve) => (release = resolve))
		);
		const first = service.run({ apply: false });
		await Promise.resolve();
		expect(service.isRunning).toBe(true);
		await expect(service.run({ apply: false })).rejects.toThrow(
			'already running'
		);
		release(jsonResponse({ data: { auctions: { auctions: [], total: 0 } } }));
		await first;
		expect(service.isRunning).toBe(false);
	});

	it('fails when sync settings are missing and does not stay locked', async () => {
		delete process.env.YAC_FX_USD_TO_JPY;
		await expect(service.run({ apply: false })).rejects.toThrow(
			/Invalid YAC configuration: YAC_FX_USD_TO_JPY/
		);
		expect(fetchMock).not.toHaveBeenCalled();
		expect(service.isRunning).toBe(false);
	});

	describe('failure cases', () => {
		it('upstream HTTP failure: retryable status exhausts attempts as YacRateLimitedError', async () => {
			fetchMock.mockResolvedValue(jsonResponse({}, 503));
			await expect(service.run({ apply: true })).rejects.toBeInstanceOf(
				YacRateLimitedError
			);
			expect(repository.persist).not.toHaveBeenCalled();
			expect(service.isRunning).toBe(false);
		});

		it('upstream HTTP failure: non-retryable status surfaces YacHttpError', async () => {
			fetchMock.mockResolvedValue(jsonResponse({}, 404));
			const error = await service.run({ apply: false }).catch((e) => e);
			expect(error).toBeInstanceOf(YacHttpError);
			expect(error.status).toBe(404);
		});

		it('upstream network failure is retried then reported as rate limited', async () => {
			fetchMock.mockRejectedValue(new TypeError('fetch failed'));
			await expect(service.run({ apply: false })).rejects.toThrow(
				/Source unavailable after 1 attempts: Request failed \(TypeError\)/
			);
		});

		it('malformed payload: non-JSON body raises a YacSourceError', async () => {
			fetchMock.mockResolvedValue(
				new Response('<html>oops</html>', { status: 200 })
			);
			const error = await service.run({ apply: true }).catch((e) => e);
			expect(error).toBeInstanceOf(YacSourceError);
			expect(error.message).toBe('GraphQL error: empty response');
			expect(repository.persist).not.toHaveBeenCalled();
		});

		it('malformed payload: GraphQL errors array raises a YacSourceError', async () => {
			fetchMock.mockResolvedValue(
				jsonResponse({ errors: [{ message: 'boom' }] })
			);
			await expect(service.run({ apply: false })).rejects.toThrow(
				'GraphQL error: boom'
			);
		});

		it('malformed payload: data without an auctions listing fails and unlocks', async () => {
			fetchMock.mockResolvedValue(jsonResponse({ data: {} }));
			await expect(service.run({ apply: false })).rejects.toThrow(TypeError);
			expect(service.isRunning).toBe(false);
		});

		it('persistence failure propagates and releases the running flag', async () => {
			fetchMock.mockResolvedValue(
				jsonResponse({ data: { auctions: { auctions: [], total: 0 } } })
			);
			repository.persist.mockRejectedValue(new Error('db down'));
			await expect(service.run({ apply: true })).rejects.toThrow('db down');
			expect(service.isRunning).toBe(false);
		});

		it('persistence failure while loading category codes propagates', async () => {
			repository.loadCategoryCodes.mockRejectedValue(new Error('db down'));
			await expect(service.run({ apply: true })).rejects.toThrow('db down');
			expect(fetchMock).not.toHaveBeenCalled();
			expect(service.isRunning).toBe(false);
		});
	});
});
