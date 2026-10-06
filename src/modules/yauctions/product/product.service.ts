import { paginatedResponse, singleResponse } from '@/utils/response.util';
import { toSearchTerms } from '@/utils/search-text.util';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaClient } from 'prisma/generated/client';
import {
	ListProductsQueryDto,
	ProductSortKey,
} from './dto/list-products-query.dto';
import {
	lotWithCategory,
	serializeCatalogItem,
	serializeProductDetail,
} from './product.serializer';

const ORDER_BY: Record<ProductSortKey, Prisma.YacLotOrderByWithRelationInput> =
	{
		ending: { endsAt: 'asc' },
		'price-asc': { priceUsd: 'asc' },
		'price-desc': { priceUsd: 'desc' },
		bids: { bids: 'desc' },
		newest: { startsAt: 'desc' },
	};

@Injectable()
export class ProductService {
	constructor(private readonly prisma: PrismaClient) {}

	async findAll(query: ListProductsQueryDto) {
		const { categories, minPrice, maxPrice, sort, page, pageSize } = query;
		const where: Prisma.YacLotWhereInput = {
			status: 'open',
			AND: toSearchTerms(query.q ?? '').map((term) => ({
				searchText: { contains: term },
			})),
			...(categories?.length && {
				category: { code: { in: categories } },
			}),
			...((minPrice !== undefined || maxPrice !== undefined) && {
				priceUsd: { gte: minPrice, lte: maxPrice },
			}),
		};
		const take = pageSize;
		const skip = (page - 1) * pageSize;
		const [lots, total] = await Promise.all([
			this.prisma.yacLot.findMany({
				where,
				orderBy: [ORDER_BY[sort], { id: 'asc' }],
				take,
				skip,
				...lotWithCategory,
			}),
			this.prisma.yacLot.count({ where }),
		]);
		return paginatedResponse(lots.map(serializeCatalogItem), total, {
			take,
			skip,
		});
	}

	async findOne(code: string) {
		const lot = await this.prisma.yacLot.findFirst({
			where: { code, status: 'open' },
			...lotWithCategory,
		});
		if (!lot) throw new NotFoundException('Product not found');
		return singleResponse(serializeProductDetail(lot));
	}
}
