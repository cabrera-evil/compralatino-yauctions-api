import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { ProductService } from './product.service';

@ApiTags('yauctions-products')
@Controller({ path: 'yauctions/products', version: '1' })
export class ProductController {
	constructor(private readonly productService: ProductService) {}

	@ApiOperation({
		summary: 'Search YAuctions open lots (public)',
		description:
			'Plain query string (no Rison): q, categories (repeated or comma-separated codes), minPrice, maxPrice (USD), sort (ending|price-asc|price-desc|bids|newest), page (1-based), pageSize (max 50). Responds with { data, pagination: { page, pageSize, total, pageCount } }.',
	})
	@Get()
	findAll(@Query() query: ListProductsQueryDto) {
		return this.productService.findAll(query);
	}

	@ApiOperation({ summary: 'Get an open YAuctions lot by code (public)' })
	@Get(':code')
	findOne(@Param('code') code: string) {
		return this.productService.findOne(code);
	}
}
