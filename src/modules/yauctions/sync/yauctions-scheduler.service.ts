import {
	Inject,
	Injectable,
	Logger,
	OnModuleDestroy,
	OnModuleInit,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { requireSyncSettings, yacConfig } from '../config/yac.config';
import { YauctionsSyncService } from './yauctions-sync.service';

@Injectable()
export class YauctionsSchedulerService
	implements OnModuleInit, OnModuleDestroy
{
	private readonly logger = new Logger(YauctionsSchedulerService.name);
	private timer?: NodeJS.Timeout;

	constructor(
		@Inject(yacConfig.KEY)
		private readonly config: ConfigType<typeof yacConfig>,
		private readonly syncService: YauctionsSyncService
	) {}

	onModuleInit(): void {
		if (!this.config.scraper.enabled) return;
		requireSyncSettings();
		const { intervalMs } = this.config.scraper;
		this.timer = setInterval(() => void this.tick(), intervalMs);
		this.timer.unref();
		this.logger.log(`YAuctions sync scheduled every ${intervalMs} ms`);
	}

	onModuleDestroy(): void {
		clearInterval(this.timer);
	}

	private async tick(): Promise<void> {
		if (this.syncService.isRunning) {
			this.logger.warn('Previous YAuctions sync still running; skipping tick');
			return;
		}
		try {
			await this.syncService.run({ apply: true });
		} catch (error) {
			this.logger.error(
				`YAuctions sync failed: ${error instanceof Error ? error.message : 'unknown error'}`
			);
		}
	}
}
