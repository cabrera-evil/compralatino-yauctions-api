import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CategoryService } from '../yauctions/category/category.service';
import { ListProductsQueryDto } from '../yauctions/product/dto/list-products-query.dto';
import type { LotWithCategory } from '../yauctions/product/product.serializer';
import { ProductService } from '../yauctions/product/product.service';
import type {
	ValidateLotsReply,
	ValidatedLotItem,
} from './yauctions-rpc.types';

export const MAX_VALIDATE_CODES = 50;
export const MAX_CODE_LENGTH = 64;

export const isOpenLot = (lot: LotWithCategory, now: number): boolean =>
	lot.status === 'open' && lot.endsAt.getTime() > now;

@Injectable()
export class YauctionsRpcService {
	private readonly logger = new Logger(YauctionsRpcService.name);

	constructor(
		private readonly productService: ProductService,
		private readonly categoryService: CategoryService
	) {}

	async listProducts(payload: unknown) {
		const isObject =
			payload === undefined || payload === null || typeof payload === 'object';
		if (!isObject || Array.isArray(payload))
			throw new RpcException('INVALID_PAYLOAD');
		const query = plainToInstance(ListProductsQueryDto, payload ?? {});
		const errors = await validate(query, {
			whitelist: true,
			forbidNonWhitelisted: false,
		});
		if (errors.length) {
			this.logger.warn('yauctions.products.list rejected invalid payload');
			throw new RpcException('INVALID_PAYLOAD');
		}
		return this.guard('yauctions.products.list', () =>
			this.productService.findAll(query)
		);
	}

	async getProduct(payload: unknown) {
		const code = (payload as { code?: unknown } | null)?.code;
		if (
			typeof code !== 'string' ||
			code.length === 0 ||
			code.length > MAX_CODE_LENGTH
		)
			throw new RpcException('INVALID_PAYLOAD');
		try {
			return await this.productService.findOne(code);
		} catch (error) {
			if (error instanceof NotFoundException)
				throw new RpcException('PRODUCT_NOT_FOUND');
			this.logger.error(`yauctions.products.get failed: ${error?.message}`);
			throw new RpcException('YAUCTIONS_INTERNAL_ERROR');
		}
	}

	listCategories() {
		return this.guard('yauctions.categories.list', () =>
			this.categoryService.findAll()
		);
	}

	async validateProducts(payload: unknown): Promise<ValidateLotsReply> {
		const codes = this.parseCodes(payload);
		if (!codes) throw new RpcException('INVALID_PAYLOAD');
		return this.guard('yauctions.products.validate', async () => {
			const lots = await this.productService.findLotsByCodes(codes);
			const byCode = new Map(lots.map((lot) => [lot.code, lot]));
			const now = Date.now();
			return {
				items: codes.map((code) => this.toItem(code, byCode.get(code), now)),
			};
		});
	}

	private async guard<T>(pattern: string, fn: () => Promise<T>): Promise<T> {
		try {
			return await fn();
		} catch (error) {
			this.logger.error(`${pattern} failed: ${error?.message}`);
			throw new RpcException('YAUCTIONS_INTERNAL_ERROR');
		}
	}

	private parseCodes(payload: unknown): string[] | null {
		const codes = (payload as { codes?: unknown } | null)?.codes;
		if (
			!Array.isArray(codes) ||
			codes.length === 0 ||
			codes.length > MAX_VALIDATE_CODES ||
			!codes.every(
				(c) =>
					typeof c === 'string' && c.length > 0 && c.length <= MAX_CODE_LENGTH
			)
		) {
			this.logger.warn('yauctions.products.validate rejected invalid payload');
			return null;
		}
		return [...new Set<string>(codes)];
	}

	private toItem(
		code: string,
		lot: LotWithCategory | undefined,
		now: number
	): ValidatedLotItem {
		if (!lot) return { code, found: false, available: false, category: null };
		return {
			code,
			found: true,
			available: isOpenLot(lot, now),
			title: lot.title,
			sellerName: lot.sellerName,
			status: lot.status === 'open' ? 'in_auction' : lot.status,
			endsAt: lot.endsAt.toISOString(),
			price: {
				usd: lot.priceUsd.toString(),
				jpy: lot.currentBidJpy.toString(),
				exchangedAt: lot.exchangedAt?.toISOString() ?? null,
			},
			currentBidUsd: lot.priceUsd.toString(),
			minIncrementUsd: lot.minIncrementUsd.toString(),
			category: { code: lot.category.code, name: lot.category.label },
		};
	}
}
