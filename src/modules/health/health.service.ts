import { Injectable } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
import {
	DiskHealthIndicator,
	HealthCheckService,
	HealthIndicatorFunction,
	MemoryHealthIndicator,
	MicroserviceHealthIndicator,
	PrismaHealthIndicator,
} from '@nestjs/terminus';
import { PrismaClient } from 'prisma/generated/client';

const DEPENDENCY_TIMEOUT_MS = 3000;

@Injectable()
export class HealthService {
	constructor(
		private readonly health: HealthCheckService,
		private readonly disk: DiskHealthIndicator,
		private readonly memory: MemoryHealthIndicator,
		private readonly prismaHealth: PrismaHealthIndicator,
		private readonly microservice: MicroserviceHealthIndicator,
		private readonly prisma: PrismaClient
	) {}

	check() {
		const indicators: HealthIndicatorFunction[] = [
			() =>
				this.disk.checkStorage('storage', {
					path: '/',
					thresholdPercent: Number(
						process.env.HEALTH_DISK_THRESHOLD_PERCENT ?? 0.95
					),
				}),
			() => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
			() =>
				this.prismaHealth.pingCheck('database', this.prisma, {
					timeout: DEPENDENCY_TIMEOUT_MS,
				}),
		];

		if (process.env.RABBITMQ_ENABLED === 'true') {
			indicators.push(() =>
				this.microservice.pingCheck('rabbitmq', {
					transport: Transport.RMQ,
					timeout: DEPENDENCY_TIMEOUT_MS,
					options: {
						urls: [process.env.RABBITMQ_URL],
						queue: process.env.RABBITMQ_QUEUE,
						// must match rabbitmq.config.ts, else the queue assert fails
						queueOptions: { durable: true },
					},
				})
			);
		}

		return this.health.check(indicators);
	}
}
