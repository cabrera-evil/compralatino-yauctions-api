import { Prisma, PrismaClient } from 'prisma/generated/client';
import type { CollectResult } from './yac-collector';
import type { MappedLot } from './yac-mapper.types';

const UPSERT_CHUNK = 100;
const MIN_OPEN_LOTS_FOR_RATIO_GUARD = 20;

export type PersistSummary = {
	categories: number;
	auctions: number;
	lotsUpserted: number;
	lotsEnded: number;
	endingSkipped?: 'end-ratio-exceeded';
};

const lotData = (
	lot: MappedLot,
	auctionId: number,
	categoryId: number,
	seenAt: Date
) => ({
	auctionId,
	categoryId,
	lotNumber: lot.lotNumber,
	title: lot.title,
	status: 'open' as const,
	sourceCurrency: lot.sourceCurrency,
	sourceCurrentBid: lot.sourceCurrentBid,
	sourceMinIncrement: lot.sourceMinIncrement,
	priceUsd: lot.priceUsd,
	currentBidJpy: lot.currentBidJpy,
	minIncrementUsd: lot.minIncrementUsd,
	minIncrementJpy: lot.minIncrementJpy,
	exchangedAt: lot.exchangedAt,
	bids: lot.bids,
	startsAt: lot.startsAt,
	endsAt: lot.endsAt,
	location: lot.location,
	sellerName: lot.sellerName,
	imageUrl: lot.imageUrl,
	searchText: lot.searchText,
	photos: lot.photos,
	descriptionParagraphs: lot.descriptionParagraphs,
	specs: lot.specs,
	shipping: lot.shipping,
	lastSeenAt: seenAt,
	endedAt: null,
});

export class YacLotRepository {
	constructor(private readonly prisma: PrismaClient) {}

	loadCategoryCodes(): Promise<{ sourceCategoryId: string; code: string }[]> {
		return this.prisma.yacCategory.findMany({
			select: { sourceCategoryId: true, code: true },
		});
	}

	async persist(
		result: CollectResult,
		runStartedAt: Date,
		maxEndRatio: number
	): Promise<PersistSummary> {
		const openBefore = await this.prisma.yacLot.count({
			where: { status: 'open' },
		});
		const categoryIds = new Map<string, number>();
		for (const category of result.categories) {
			const saved = await this.prisma.yacCategory.upsert({
				where: { sourceCategoryId: category.sourceCategoryId },
				create: category,
				update: { label: category.label },
				select: { id: true },
			});
			categoryIds.set(category.sourceCategoryId, saved.id);
		}

		const auctionIds = new Map<string, number>();
		for (const { auction } of result.auctions) {
			const data = { ...auction, lastSeenAt: runStartedAt };
			const saved = await this.prisma.yacAuction.upsert({
				where: { sourceAuctionId: auction.sourceAuctionId },
				create: data,
				update: data,
				select: { id: true },
			});
			auctionIds.set(auction.sourceAuctionId, saved.id);
		}

		const lots = result.auctions.flatMap((a) => a.lots);
		for (let i = 0; i < lots.length; i += UPSERT_CHUNK) {
			await this.prisma.$transaction(
				lots.slice(i, i + UPSERT_CHUNK).map((lot) => {
					const data = lotData(
						lot,
						auctionIds.get(lot.sourceAuctionId),
						categoryIds.get(lot.category.sourceCategoryId),
						runStartedAt
					);
					return this.prisma.yacLot.upsert({
						where: { sourceLotId: lot.sourceLotId },
						create: { sourceLotId: lot.sourceLotId, code: lot.code, ...data },
						update: data,
						select: { id: true },
					});
				})
			);
		}

		const ended = await this.markEnded(
			result,
			runStartedAt,
			openBefore,
			maxEndRatio
		);
		return {
			categories: categoryIds.size,
			auctions: auctionIds.size,
			lotsUpserted: lots.length,
			lotsEnded: ended.count,
			...(ended.skipped && { endingSkipped: ended.skipped }),
		};
	}

	// Only lots of fully read auctions, or of auctions no longer listed, can be declared ended.
	private async markEnded(
		result: CollectResult,
		runStartedAt: Date,
		openBefore: number,
		maxEndRatio: number
	): Promise<{ count: number; skipped?: 'end-ratio-exceeded' }> {
		const completeIds = result.auctions
			.filter((a) => a.complete)
			.map((a) => a.auction.sourceAuctionId);
		const scopes: Prisma.YacLotWhereInput[] = [];
		if (completeIds.length)
			scopes.push({ auction: { sourceAuctionId: { in: completeIds } } });
		if (result.auctionListComplete && result.listedAuctionIds.length)
			scopes.push({
				auction: { sourceAuctionId: { notIn: result.listedAuctionIds } },
			});
		if (!scopes.length) return { count: 0 };
		const where: Prisma.YacLotWhereInput = {
			status: 'open',
			lastSeenAt: { lt: runStartedAt },
			OR: scopes,
		};
		if (openBefore >= MIN_OPEN_LOTS_FOR_RATIO_GUARD) {
			const candidates = await this.prisma.yacLot.count({ where });
			if (candidates / openBefore > maxEndRatio)
				return { count: 0, skipped: 'end-ratio-exceeded' };
		}
		const { count } = await this.prisma.yacLot.updateMany({
			where,
			data: { status: 'ended', endedAt: runStartedAt },
		});
		return { count };
	}
}
