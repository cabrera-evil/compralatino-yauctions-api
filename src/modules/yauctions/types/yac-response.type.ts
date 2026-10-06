import type { YacPhoto, YacShipping, YacSpec } from './yac-json.type';

export type CurrencyCode = 'USD' | 'JPY';

export type Money<C extends CurrencyCode = CurrencyCode> = {
	amount: number;
	currency: C;
};

export type DualMoney = {
	usd: Money<'USD'>;
	jpy: Money<'JPY'>;
	exchangedAt?: string;
};

export type YacStatusKey = 'in_auction';

export type CatalogItem = {
	id: string;
	title: string;
	categoryCode: string;
	currentBid: DualMoney;
	endsAt: string;
	listedAt: string;
	bids: number;
	status: YacStatusKey;
	imageUrl?: string;
};

export type ProductSeller = {
	name: string;
	location: string;
	positiveRatePercent: number;
};

export type ProductDetail = Omit<CatalogItem, 'listedAt'> & {
	categoryLabel: string;
	minIncrement: DualMoney;
	conditionGrade: string;
	conditionSummary: string;
	seller: ProductSeller;
	photos: YacPhoto[];
	description: string[];
	specs: YacSpec[];
	shipping: YacShipping;
};
