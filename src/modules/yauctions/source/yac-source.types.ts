export type YacAmount = number | string | null;

export type YacLocation = {
	city?: string | null;
	state_name?: string | null;
};

export type YacRawAuction = {
	auction_id: string;
	auction_ref?: string | null;
	title: string;
	type?: string | null;
	start_time?: string | null;
	end_time?: string | null;
	public_url?: string | null;
	front_visible_lot_count?: number | null;
	auction_status?: number | null;
	auction_location?: YacLocation | null;
};

export type YacRawCategory = {
	category_id: string;
	name: string;
	paths?: { category_id: string; name: string }[] | null;
};

export type YacRawPrimaryImage = {
	attachment_id?: string | number | null;
	url?: string | null;
	large?: string | null;
	medium?: string | null;
	small?: string | null;
	thumb?: string | null;
};

export type YacRawChoice = { value: string | number; label: string };

export type YacRawDynamicFieldOptions = {
	choices?: YacRawChoice[] | null;
	description_label?: string | null;
	description_sort?: number | string | null;
};

export type YacRawDynamicValue = string | number | boolean | null;

export type YacRawDynamicField = {
	label: string;
	type?: string | null;
	dynamic_field_id?: string | null;
	data?: { value?: YacRawDynamicValue | YacRawDynamicValue[] } | null;
	options?: YacRawDynamicFieldOptions | null;
};

export type YacRawLot = {
	auction_lot_id: string;
	auction_id: string;
	lot_number?: string | null;
	title: string;
	description?: string | null;
	start_time: string;
	end_time: string;
	bid_count?: number | null;
	bid_increment_amount?: YacAmount;
	required_bid?: YacAmount;
	starting_bid?: YacAmount;
	winning_bid_amount?: YacAmount;
	same_as_auction_location?: boolean | null;
	lot_location?: YacLocation | null;
	is_past_end_time?: boolean | null;
	is_passed?: boolean | null;
	is_no_sale?: boolean | null;
	category_id?: string | null;
	category?: YacRawCategory | null;
	primary_image?: YacRawPrimaryImage | null;
	dynamic_fields?: YacRawDynamicField[] | null;
};

export type YacAuctionsData = {
	auctions: { total: number; auctions: YacRawAuction[] };
};

export type YacAuctionLotsData = {
	auction: {
		auction_id: string;
		lots: { total: number; lots: YacRawLot[] };
	} | null;
};

export type YacRawDetailImage = {
	attachment_id: string | number;
	cached_assets?: { variant?: string | null; url?: string | null }[] | null;
};

export type YacLotDetailData = {
	lot: {
		auction_lot_id: string;
		description_plain?: string | null;
		images?: YacRawDetailImage[] | null;
	} | null;
};

export type YacGraphQlError = {
	message?: string;
	extensions?: { code?: string };
};

export type YacGraphQlResponse<T> = {
	data?: T | null;
	errors?: YacGraphQlError[];
};
