import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
	IsArray,
	IsIn,
	IsInt,
	IsNumber,
	IsOptional,
	IsString,
	Max,
	MaxLength,
	Min,
} from 'class-validator';

export const PRODUCT_SORT_KEYS = [
	'ending',
	'price-asc',
	'price-desc',
	'bids',
	'newest',
] as const;

export type ProductSortKey = (typeof PRODUCT_SORT_KEYS)[number];

export const PRODUCT_MAX_PAGE_SIZE = 50;
export const PRODUCT_MAX_PAGE = 10000;

const toCodeList = ({ value }: { value: unknown }): string[] | undefined => {
	if (value === undefined || value === '') return undefined;
	const items = Array.isArray(value) ? value : [value];
	const codes = items
		.flatMap((item) => String(item).split(','))
		.map((code) => code.trim())
		.filter(Boolean);
	return [...new Set(codes)];
};

const toOptionalNumber = ({ value }: { value: unknown }): number | undefined =>
	value === undefined || value === '' ? undefined : Number(value);

export class ListProductsQueryDto {
	@ApiPropertyOptional({
		description:
			'Free text; accent/case-insensitive, every word must match title or category label',
	})
	@IsOptional()
	@IsString()
	@MaxLength(100)
	q?: string;

	@ApiPropertyOptional({
		type: [String],
		description:
			'Category codes; repeat the param (categories=a&categories=b) or comma-separate (categories=a,b); empty = all',
	})
	@IsOptional()
	@Transform(toCodeList)
	@IsArray()
	@IsString({ each: true })
	categories?: string[];

	@ApiPropertyOptional({ description: 'Minimum current bid in USD' })
	@IsOptional()
	@Transform(toOptionalNumber)
	@IsNumber()
	@Min(0)
	minPrice?: number;

	@ApiPropertyOptional({ description: 'Maximum current bid in USD' })
	@IsOptional()
	@Transform(toOptionalNumber)
	@IsNumber()
	@Min(0)
	maxPrice?: number;

	@ApiPropertyOptional({ enum: PRODUCT_SORT_KEYS, default: 'ending' })
	@IsOptional()
	@IsIn(PRODUCT_SORT_KEYS)
	sort: ProductSortKey = 'ending';

	@ApiPropertyOptional({
		default: 1,
		minimum: 1,
		maximum: PRODUCT_MAX_PAGE,
	})
	@IsOptional()
	@Transform(({ value }) => Number(value))
	@IsInt()
	@Min(1)
	@Max(PRODUCT_MAX_PAGE)
	page: number = 1;

	@ApiPropertyOptional({
		default: 10,
		minimum: 1,
		maximum: PRODUCT_MAX_PAGE_SIZE,
	})
	@IsOptional()
	@Transform(({ value }) => Number(value))
	@IsInt()
	@Min(1)
	@Max(PRODUCT_MAX_PAGE_SIZE)
	pageSize: number = 10;
}
