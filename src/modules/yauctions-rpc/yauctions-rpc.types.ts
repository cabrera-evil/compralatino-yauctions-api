export type ValidatedLotItem = {
	code: string;
	found: boolean;
	available: boolean;
	title?: string;
	sellerName?: string;
	status?: string;
	endsAt?: string;
	price?: { usd: string; jpy: string; exchangedAt?: string | null };
	category: { code: string; name: string } | null;
};

export type ValidateLotsReply = { items: ValidatedLotItem[] };
