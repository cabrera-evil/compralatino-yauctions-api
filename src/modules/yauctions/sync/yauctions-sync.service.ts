import { Logger } from '@nestjs/common';
import { requireSyncSettings, type YacConfig } from '../config/yac.config';
import { YacGraphqlClient } from '../source/yac-graphql.client';
import { YacCategoryCodes } from './yac-category-codes';
import { YacCollector, type CollectResult } from './yac-collector';
import type { PersistSummary, YacLotRepository } from './yac-lot.repository';
import type { SkipReason } from './yac-mapper.types';

const SAMPLE_SIZE = 3;

export type YacSyncRunOptions = {
	apply: boolean;
	maxAuctions?: number;
	maxLots?: number;
};

export type YacSyncSample = {
	code: string;
	title: string;
	categoryCode: string;
	bids: number;
	sourceCurrentBid: string;
	priceUsd: string;
	currentBidJpy: string;
	endsAt: string;
	imageUrl: string | null;
	specs: number;
	descriptionParagraphs: number;
};

export type YacSyncReport = {
	mode: 'apply' | 'dry-run';
	auctionsListed: number;
	auctionsRead: number;
	auctionsComplete: number;
	auctionListComplete: boolean;
	lotsFetched: number;
	lotsMapped: number;
	skipped: Record<SkipReason, number>;
	categories: number;
	requests: number;
	elapsedMs: number;
	persisted?: PersistSummary;
	samples: YacSyncSample[];
};

const toSamples = (result: CollectResult): YacSyncSample[] =>
	result.auctions
		.flatMap((a) => a.lots)
		.slice(0, SAMPLE_SIZE)
		.map((lot) => ({
			code: lot.code,
			title: lot.title,
			categoryCode: lot.category.code,
			bids: lot.bids,
			sourceCurrentBid: `${lot.sourceCurrentBid.toFixed(2)} ${lot.sourceCurrency}`,
			priceUsd: lot.priceUsd.toFixed(2),
			currentBidJpy: lot.currentBidJpy.toFixed(0),
			endsAt: lot.endsAt.toISOString(),
			imageUrl: lot.imageUrl,
			specs: lot.specs.length,
			descriptionParagraphs: lot.descriptionParagraphs.length,
		}));

export class YauctionsSyncService {
	private readonly logger = new Logger(YauctionsSyncService.name);
	private running = false;

	constructor(
		private readonly config: YacConfig,
		private readonly repository?: YacLotRepository
	) {}

	get isRunning(): boolean {
		return this.running;
	}

	async run(options: YacSyncRunOptions): Promise<YacSyncReport> {
		if (this.running) throw new Error('A YAuctions sync is already running');
		if (options.apply && !this.repository)
			throw new Error('Applying a sync requires a database repository');
		this.running = true;
		const startedAt = new Date();
		try {
			const settings = requireSyncSettings();
			const client = new YacGraphqlClient(this.config.api);
			const existing = options.apply
				? await this.repository.loadCategoryCodes()
				: [];
			const result = await new YacCollector(client, settings).collect(
				{
					maxAuctions: options.maxAuctions ?? this.config.bounds.maxAuctions,
					maxLotsPerAuction:
						options.maxLots ?? this.config.bounds.maxLotsPerAuction,
					lotsPageSize: this.config.bounds.lotsPageSize,
					enrichDetails: this.config.enrichDetails,
				},
				new YacCategoryCodes(existing)
			);
			const persisted = options.apply
				? await this.repository.persist(result, startedAt)
				: undefined;
			const report: YacSyncReport = {
				mode: options.apply ? 'apply' : 'dry-run',
				auctionsListed: result.listedAuctionIds.length,
				auctionsRead: result.auctions.length,
				auctionsComplete: result.auctions.filter((a) => a.complete).length,
				auctionListComplete: result.auctionListComplete,
				lotsFetched: result.lotsFetched,
				lotsMapped: result.auctions.reduce((n, a) => n + a.lots.length, 0),
				skipped: result.skipped,
				categories: result.categories.length,
				requests: client.requestCount,
				elapsedMs: Date.now() - startedAt.getTime(),
				persisted,
				samples: toSamples(result),
			};
			this.logger.log(
				`${report.mode}: ${report.lotsMapped} lots, ${report.requests} requests`
			);
			return report;
		} finally {
			this.running = false;
		}
	}
}
