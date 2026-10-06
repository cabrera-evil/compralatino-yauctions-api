import { htmlToParagraphs } from '@/utils/html-text.util';
import { Logger } from '@nestjs/common';
import type { YacSyncSettings } from '../config/yac.config';
import type { YacGraphqlClient } from '../source/yac-graphql.client';
import type { YacRawDetailImage, YacRawLot } from '../source/yac-source.types';
import type { YacPhoto } from '../types/yac-json.type';
import type { YacCategoryCodes } from './yac-category-codes';
import {
	type MapContext,
	isSafeImageUrl,
	mapAuction,
	mapLot,
} from './yac-mapper';
import type {
	MappedAuction,
	MappedCategory,
	MappedLot,
	SkipReason,
} from './yac-mapper.types';
import { parseRates } from './yac-money';

export type YacCollectOptions = {
	maxAuctions: number;
	maxLotsPerAuction: number;
	lotsPageSize: number;
	enrichDetails: boolean;
};

export type CollectedAuction = {
	auction: MappedAuction;
	lots: MappedLot[];
	total: number;
	// True when every open lot of the auction was read (not cut by bounds).
	complete: boolean;
};

export type CollectResult = {
	auctions: CollectedAuction[];
	listedAuctionIds: string[];
	auctionListComplete: boolean;
	categories: MappedCategory[];
	lotsFetched: number;
	skipped: Record<SkipReason, number>;
};

const detailPhotos = (
	lotId: string,
	images?: YacRawDetailImage[] | null
): YacPhoto[] =>
	(images ?? []).flatMap((image, index) => {
		const urls = (image.cached_assets ?? []).filter((asset) =>
			isSafeImageUrl(asset.url)
		);
		const url = (urls.find((a) => a.variant === 'large') ?? urls[0])?.url;
		return url
			? [
					{
						id: String(image.attachment_id ?? `${lotId}-${index + 1}`),
						label: `Photo ${index + 1}`,
						url,
					},
				]
			: [];
	});

export class YacCollector {
	private readonly logger = new Logger(YacCollector.name);

	constructor(
		private readonly client: YacGraphqlClient,
		private readonly settings: YacSyncSettings
	) {}

	async collect(
		options: YacCollectOptions,
		categories: YacCategoryCodes
	): Promise<CollectResult> {
		const ctx: MapContext = {
			settings: this.settings,
			rates: parseRates(this.settings.fxSourceToUsd, this.settings.fxUsdToJpy),
			categories,
		};
		const { auctions: listing } = await this.client.fetchAuctions(
			options.maxAuctions
		);
		const selected = listing.auctions.slice(0, options.maxAuctions);
		const result: CollectResult = {
			auctions: [],
			listedAuctionIds: listing.auctions.map((a) => String(a.auction_id)),
			auctionListComplete:
				listing.auctions.length > 0 &&
				listing.total > 0 &&
				listing.total <= listing.auctions.length,
			categories: [],
			lotsFetched: 0,
			skipped: {
				'not-open': 0,
				'no-category': 0,
				'no-price': 0,
				'invalid-dates': 0,
				'invalid-amount': 0,
			},
		};
		const seenCategories = new Map<string, MappedCategory>();

		for (const rawAuction of selected) {
			const auction = mapAuction(rawAuction);
			const collected: CollectedAuction =
				rawAuction.front_visible_lot_count === 0
					? { auction, lots: [], total: 0, complete: true }
					: await this.collectAuction(auction, options, ctx, result);
			for (const lot of collected.lots)
				seenCategories.set(lot.category.sourceCategoryId, lot.category);
			result.auctions.push(collected);
		}
		result.categories = [...seenCategories.values()];
		return result;
	}

	private async collectAuction(
		auction: MappedAuction,
		options: YacCollectOptions,
		ctx: MapContext,
		result: CollectResult
	): Promise<CollectedAuction> {
		const pageSize = Math.min(options.lotsPageSize, options.maxLotsPerAuction);
		const rawLots = new Map<string, YacRawLot>();
		let total = 0;
		let reachable = true;

		for (let page = 1; ; page++) {
			const { auction: data } = await this.client.fetchAuctionLots(
				auction.sourceAuctionId,
				page,
				pageSize
			);
			if (!data) {
				reachable = false;
				break;
			}
			total = data.lots.total;
			for (const lot of data.lots.lots)
				rawLots.set(String(lot.auction_lot_id), lot);
			this.logger.log(
				`Auction ${auction.sourceAuctionId}: page ${page}, ${rawLots.size}/${total} lots`
			);
			const exhausted = data.lots.lots.length === 0 || page * pageSize >= total;
			if (exhausted || rawLots.size >= options.maxLotsPerAuction) break;
		}

		const kept = [...rawLots.values()].slice(0, options.maxLotsPerAuction);
		result.lotsFetched += kept.length;
		const lots: MappedLot[] = [];
		for (const raw of kept) {
			const mapped = mapLot(raw, auction, ctx);
			if ('skipped' in mapped) result.skipped[mapped.skipped]++;
			else lots.push(mapped.lot);
		}
		if (options.enrichDetails) for (const lot of lots) await this.enrich(lot);
		return {
			auction,
			lots,
			total,
			complete: reachable && kept.length >= total,
		};
	}

	// Optional: costs one request per lot, so it stays off unless YAC_ENRICH_DETAILS is set.
	private async enrich(lot: MappedLot): Promise<void> {
		const { lot: detail } = await this.client.fetchLotDetail(lot.sourceLotId);
		if (!detail) return;
		const photos = detailPhotos(lot.sourceLotId, detail.images);
		if (photos.length) {
			lot.photos = photos;
			lot.imageUrl = photos[0].url ?? lot.imageUrl;
		}
		const paragraphs = htmlToParagraphs(detail.description_plain);
		if (paragraphs.length) lot.descriptionParagraphs = paragraphs;
	}
}
