import { Logger } from '@nestjs/common';
import { YauctionsSchedulerService } from './yauctions-scheduler.service';

const SYNC_ENV = {
	YAC_SOURCE_CURRENCY: 'USD',
	YAC_FX_SOURCE_TO_USD: '1',
	YAC_FX_USD_TO_JPY: '150',
	YAC_FX_AS_OF: '2026-10-01T00:00:00Z',
	YAC_SELLER_NAME: 'Test Seller',
};

const INTERVAL = 60000;

describe('YauctionsSchedulerService', () => {
	const savedEnv = process.env;
	let sync: { isRunning: boolean; run: jest.Mock };
	let warn: jest.SpyInstance;
	let error: jest.SpyInstance;
	let log: jest.SpyInstance;

	const build = (enabled: boolean) =>
		new YauctionsSchedulerService(
			{ scraper: { enabled, intervalMs: INTERVAL } } as never,
			sync as never
		);

	beforeEach(() => {
		jest.resetAllMocks();
		jest.useFakeTimers();
		log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
		warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
		error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
		process.env = { ...savedEnv, ...SYNC_ENV };
		sync = { isRunning: false, run: jest.fn().mockResolvedValue({}) };
	});

	afterEach(() => {
		jest.useRealTimers();
		process.env = savedEnv;
	});

	it('does nothing when the scraper is disabled', async () => {
		const scheduler = build(false);
		scheduler.onModuleInit();
		await jest.advanceTimersByTimeAsync(INTERVAL * 3);
		expect(sync.run).not.toHaveBeenCalled();
		expect(log).not.toHaveBeenCalled();
	});

	it('fails fast at boot when enabled without sync settings', () => {
		delete process.env.YAC_SELLER_NAME;
		expect(() => build(true).onModuleInit()).toThrow(
			/Invalid YAC configuration: YAC_SELLER_NAME/
		);
	});

	it('runs an applying sync every interval until destroyed', async () => {
		const scheduler = build(true);
		scheduler.onModuleInit();
		await jest.advanceTimersByTimeAsync(INTERVAL * 2);
		expect(sync.run).toHaveBeenCalledTimes(2);
		expect(sync.run).toHaveBeenCalledWith({ apply: true });
		scheduler.onModuleDestroy();
		await jest.advanceTimersByTimeAsync(INTERVAL * 2);
		expect(sync.run).toHaveBeenCalledTimes(2);
	});

	it('skips a tick while the previous sync is still running', async () => {
		sync.isRunning = true;
		const scheduler = build(true);
		scheduler.onModuleInit();
		await jest.advanceTimersByTimeAsync(INTERVAL);
		expect(sync.run).not.toHaveBeenCalled();
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('still running'));
		scheduler.onModuleDestroy();
	});

	it('logs a failing sync (upstream/persistence error) and keeps scheduling', async () => {
		sync.run.mockRejectedValueOnce(new Error('db down'));
		const scheduler = build(true);
		scheduler.onModuleInit();
		await jest.advanceTimersByTimeAsync(INTERVAL * 2);
		expect(error).toHaveBeenCalledWith('YAuctions sync failed: db down');
		expect(sync.run).toHaveBeenCalledTimes(2);
		scheduler.onModuleDestroy();
	});

	it('logs a generic message for non-Error rejections', async () => {
		sync.run.mockRejectedValueOnce('nope');
		const scheduler = build(true);
		scheduler.onModuleInit();
		await jest.advanceTimersByTimeAsync(INTERVAL);
		expect(error).toHaveBeenCalledWith('YAuctions sync failed: unknown error');
		scheduler.onModuleDestroy();
	});
});
