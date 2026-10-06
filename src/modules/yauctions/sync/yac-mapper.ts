import { htmlToParagraphs } from '@/utils/html-text.util';
import { buildProductSearchText } from '@/utils/search-text.util';
import type { YacSyncSettings } from '../config/yac.config';
import type {
	YacLocation,
	YacRawAuction,
	YacRawChoice,
	YacRawDynamicField,
	YacRawDynamicValue,
	YacRawLot,
	YacRawPrimaryImage,
} from '../source/yac-source.types';
import type { YacPhoto, YacSpec } from '../types/yac-json.type';
import type { YacCategoryCodes } from './yac-category-codes';
import type { MapLotResult, MappedAuction } from './yac-mapper.types';
import { convertAmount, type FxRates, toDecimal } from './yac-money';

export const YAC_CODE_PREFIX = 'yac-';

const TITLE_MAX = 512;
const LOCATION_MAX = 255;

export type MapContext = {
	settings: YacSyncSettings;
	rates: FxRates;
	categories: YacCategoryCodes;
};

export const lotCode = (sourceLotId: string): string =>
	`${YAC_CODE_PREFIX}${sourceLotId}`;

const formatLocation = (location?: YacLocation | null): string =>
	[location?.city, location?.state_name]
		.map((part) => part?.trim())
		.filter(Boolean)
		.join(', ')
		.slice(0, LOCATION_MAX);

const parseDate = (value?: string | null): Date | null => {
	if (!value) return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
};

export const mapAuction = (raw: YacRawAuction): MappedAuction => ({
	sourceAuctionId: String(raw.auction_id),
	reference: raw.auction_ref ?? null,
	title: raw.title.slice(0, 255),
	type: raw.type ?? null,
	location: formatLocation(raw.auction_location),
	startsAt: parseDate(raw.start_time),
	endsAt: parseDate(raw.end_time),
});

const isPresent = (value: YacRawDynamicValue | undefined): boolean =>
	value !== null && value !== undefined && String(value).trim() !== '';

const resolveChoice = (
	value: YacRawDynamicValue,
	choices: YacRawChoice[]
): string => {
	const choice = choices.find((c) => String(c.value) === String(value));
	return String(choice?.label ?? value).trim();
};

const resolveSpecValue = (field: YacRawDynamicField): string => {
	const raw = field.data?.value;
	const choices = field.options?.choices ?? [];
	const values = (Array.isArray(raw) ? raw : [raw]).filter(
		(v): v is string | number =>
			(typeof v === 'string' || typeof v === 'number') && isPresent(v)
	);
	return values
		.map((v) => resolveChoice(v, choices))
		.filter(Boolean)
		.join(', ');
};

const sortWeight = (field: YacRawDynamicField): number => {
	const weight = Number(field.options?.description_sort);
	return Number.isFinite(weight) ? weight : Number.MAX_SAFE_INTEGER;
};

export const mapSpecs = (fields?: YacRawDynamicField[] | null): YacSpec[] =>
	(fields ?? [])
		.map((field, index) => ({ field, index }))
		.sort(
			(a, b) => sortWeight(a.field) - sortWeight(b.field) || a.index - b.index
		)
		.map(({ field }) => ({
			label: (field.options?.description_label || field.label || '')
				.replace(/\s*:\s*$/, '')
				.trim(),
			value: resolveSpecValue(field),
		}))
		.filter((spec) => spec.label && spec.value);

export const primaryImageUrl = (
	image?: YacRawPrimaryImage | null
): string | null => image?.large ?? image?.url ?? image?.medium ?? null;

export const mapPrimaryPhoto = (
	lotId: string,
	image?: YacRawPrimaryImage | null
): YacPhoto[] => {
	const url = primaryImageUrl(image);
	return url
		? [
				{
					id: String(image?.attachment_id ?? `${lotId}-1`),
					label: 'Photo 1',
					url,
				},
			]
		: [];
};

// Current bid = winning bid, else the starting bid (required_bid when the start is hidden).
export const mapLot = (
	raw: YacRawLot,
	auction: MappedAuction,
	ctx: MapContext
): MapLotResult => {
	if (raw.is_passed || raw.is_no_sale || raw.is_past_end_time)
		return { skipped: 'not-open' };
	const category = raw.category;
	if (!category?.category_id) return { skipped: 'no-category' };
	const startsAt = parseDate(raw.start_time);
	const endsAt = parseDate(raw.end_time);
	if (!startsAt || !endsAt) return { skipped: 'invalid-dates' };
	const current =
		toDecimal(raw.winning_bid_amount) ??
		toDecimal(raw.starting_bid) ??
		toDecimal(raw.required_bid);
	if (!current) return { skipped: 'no-price' };
	const increment = toDecimal(raw.bid_increment_amount) ?? toDecimal(0);

	const sourceLotId = String(raw.auction_lot_id);
	const sourceCategoryId = String(category.category_id);
	const bid = convertAmount(current, ctx.rates);
	const step = convertAmount(increment, ctx.rates);
	const label = category.name.trim().slice(0, 255);
	const location =
		(!raw.same_as_auction_location && formatLocation(raw.lot_location)) ||
		auction.location;
	const photos = mapPrimaryPhoto(sourceLotId, raw.primary_image);
	const title = raw.title.trim().slice(0, TITLE_MAX);

	return {
		lot: {
			sourceLotId,
			code: lotCode(sourceLotId),
			sourceAuctionId: auction.sourceAuctionId,
			category: {
				sourceCategoryId,
				code: ctx.categories.resolve(sourceCategoryId, label),
				label,
			},
			lotNumber: raw.lot_number ?? null,
			title,
			sourceCurrency: ctx.settings.sourceCurrency,
			sourceCurrentBid: bid.source,
			sourceMinIncrement: step.source,
			priceUsd: bid.usd,
			currentBidJpy: bid.jpy,
			minIncrementUsd: step.usd,
			minIncrementJpy: step.jpy,
			exchangedAt: ctx.settings.fxAsOf,
			bids: raw.bid_count ?? 0,
			startsAt,
			endsAt,
			location,
			sellerName: ctx.settings.sellerName,
			imageUrl: photos[0]?.url ?? null,
			searchText: buildProductSearchText(title, label),
			photos,
			descriptionParagraphs: htmlToParagraphs(raw.description),
			specs: mapSpecs(raw.dynamic_fields),
			shipping: {
				deliveryWindow: '',
				pickupPoint: location,
				coverage: '',
				freightNote: '',
				stages: [],
			},
		},
	};
};
