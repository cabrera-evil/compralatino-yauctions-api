import { ServiceUnavailableException } from '@nestjs/common';
import {
	DiskHealthIndicator,
	HealthIndicatorService,
	MemoryHealthIndicator,
	MicroserviceHealthIndicator,
	PrismaHealthIndicator,
	TerminusModule,
} from '@nestjs/terminus';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from 'prisma/generated/client';
import { HealthService } from './health.service';

describe('HealthService', () => {
	const originalEnv = { ...process.env };
	const up = (key: string) => Promise.resolve({ [key]: { status: 'up' } });
	const down = (key: string) =>
		Promise.reject(
			new ServiceUnavailableException({
				[key]: { status: 'down', message: 'unreachable' },
			})
		);
	const prismaPing = jest.fn();
	const rmqPing = jest.fn();
	let service: HealthService;

	beforeEach(async () => {
		process.env.RABBITMQ_URL = 'amqp://localhost:5672';
		process.env.RABBITMQ_QUEUE = 'test-queue';
		prismaPing.mockImplementation(up);
		rmqPing.mockImplementation(up);

		const module: TestingModule = await Test.createTestingModule({
			imports: [TerminusModule],
			providers: [
				HealthService,
				{ provide: PrismaClient, useValue: {} },
				{ provide: PrismaHealthIndicator, useValue: { pingCheck: prismaPing } },
				{
					provide: MicroserviceHealthIndicator,
					useValue: { pingCheck: rmqPing },
				},
				{
					provide: DiskHealthIndicator,
					useValue: { checkStorage: (k: string) => up(k) },
				},
				{
					provide: MemoryHealthIndicator,
					useValue: { checkHeap: (k: string) => up(k) },
				},
			],
		})
			.overrideProvider(HealthIndicatorService)
			.useValue({})
			.compile();

		service = module.get(HealthService);
	});

	afterEach(() => {
		process.env = { ...originalEnv };
		jest.clearAllMocks();
	});

	it('reports database and rabbitmq when enabled and healthy', async () => {
		process.env.RABBITMQ_ENABLED = 'true';
		const res = await service.check();
		expect(res.status).toBe('ok');
		expect(Object.keys(res.info ?? {})).toEqual(
			expect.arrayContaining(['storage', 'memory_heap', 'database', 'rabbitmq'])
		);
		expect(rmqPing).toHaveBeenCalledTimes(1);
	});

	it('fails with 503 when the database is down', async () => {
		process.env.RABBITMQ_ENABLED = 'true';
		prismaPing.mockImplementation(down);
		await expect(service.check()).rejects.toBeInstanceOf(
			ServiceUnavailableException
		);
	});

	it('fails with 503 when rabbitmq is down', async () => {
		process.env.RABBITMQ_ENABLED = 'true';
		rmqPing.mockImplementation(down);
		await expect(service.check()).rejects.toBeInstanceOf(
			ServiceUnavailableException
		);
	});

	it('skips rabbitmq when disabled', async () => {
		process.env.RABBITMQ_ENABLED = 'false';
		rmqPing.mockImplementation(down);
		const res = await service.check();
		expect(res.status).toBe('ok');
		expect(res.info).not.toHaveProperty('rabbitmq');
		expect(rmqPing).not.toHaveBeenCalled();
	});
});
