import { Prisma } from 'prisma/generated/client';
import type {
	CatalogItem,
	DualMoney,
	ProductDetail,
} from '../types/yac-response.type';

export const lotWithCategory = {
	include: { category: { select: { code: true, label: true } } },
} satisfies Prisma.YacLotDefaultArgs;

export type LotWithCategory = Prisma.YacLotGetPayload<typeof lotWithCategory>;

const toDualMoney = (
	usd: Prisma.Decimal,
	jpy: Prisma.Decimal,
	exchangedAt?: Date | null
): DualMoney => ({
	usd: { amount: usd.toNumber(), currency: 'USD' },
	jpy: { amount: jpy.toNumber(), currency: 'JPY' },
	...(exchangedAt && { exchangedAt: exchangedAt.toISOString() }),
});

const serializeBase = (lot: LotWithCategory) => ({
	id: lot.code,
	title: lot.title,
	categoryCode: lot.category.code,
	currentBid: toDualMoney(lot.priceUsd, lot.currentBidJpy, lot.exchangedAt),
	endsAt: lot.endsAt.toISOString(),
	bids: lot.bids,
	status: 'in_auction' as const,
	...(lot.imageUrl && { imageUrl: lot.imageUrl }),
});

export const serializeCatalogItem = (lot: LotWithCategory): CatalogItem => ({
	...serializeBase(lot),
	listedAt: lot.startsAt.toISOString(),
});

export const serializeProductDetail = (
	lot: LotWithCategory
): ProductDetail => ({
	...serializeBase(lot),
	categoryLabel: lot.category.label,
	minIncrement: toDualMoney(
		lot.minIncrementUsd,
		lot.minIncrementJpy,
		lot.exchangedAt
	),
	conditionGrade: '',
	conditionSummary: '',
	seller: {
		name: lot.sellerName,
		location: lot.location,
		positiveRatePercent: 0,
	},
	photos: lot.photos,
	description: lot.descriptionParagraphs,
	specs: lot.specs,
	shipping: lot.shipping,
});
