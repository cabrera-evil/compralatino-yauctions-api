import type { Prisma } from 'prisma/generated/client';
import type { YacPhoto, YacShipping, YacSpec } from '../types/yac-json.type';

export type MappedAuction = {
	sourceAuctionId: string;
	reference: string | null;
	title: string;
	type: string | null;
	location: string;
	startsAt: Date | null;
	endsAt: Date | null;
};

export type MappedCategory = {
	sourceCategoryId: string;
	code: string;
	label: string;
};

export type MappedLot = {
	sourceLotId: string;
	code: string;
	sourceAuctionId: string;
	category: MappedCategory;
	lotNumber: string | null;
	title: string;
	sourceCurrency: string;
	sourceCurrentBid: Prisma.Decimal;
	sourceMinIncrement: Prisma.Decimal;
	priceUsd: Prisma.Decimal;
	currentBidJpy: Prisma.Decimal;
	minIncrementUsd: Prisma.Decimal;
	minIncrementJpy: Prisma.Decimal;
	exchangedAt: Date;
	bids: number;
	startsAt: Date;
	endsAt: Date;
	location: string;
	sellerName: string;
	imageUrl: string | null;
	searchText: string;
	photos: YacPhoto[];
	descriptionParagraphs: string[];
	specs: YacSpec[];
	shipping: YacShipping;
};

export type SkipReason =
	| 'not-open'
	| 'no-category'
	| 'no-price'
	| 'invalid-dates'
	| 'invalid-amount';

export type MapLotResult = { lot: MappedLot } | { skipped: SkipReason };
