import { Injectable } from '@nestjs/common';
import {
	DiskHealthIndicator,
	HealthCheckService,
	MemoryHealthIndicator,
} from '@nestjs/terminus';

@Injectable()
export class HealthService {
	constructor(
		private readonly health: HealthCheckService,
		private readonly disk: DiskHealthIndicator,
		private readonly memory: MemoryHealthIndicator
	) {}

	check() {
		return this.health.check([
			() =>
				this.disk.checkStorage('storage', {
					path: '/',
					thresholdPercent: Number(
						process.env.HEALTH_DISK_THRESHOLD_PERCENT ?? 0.95
					),
				}),
			() => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
		]);
	}
}
