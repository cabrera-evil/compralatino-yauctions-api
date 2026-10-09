import { NotFoundException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Prisma } from 'prisma/generated/client';
import { YauctionsRpcService } from './yauctions-rpc.service';

const HOUR = 3_600_000;

const lot = (over: Record<string, unknown> = {}) =>
	({
		code: 'yac-1',
		title: 'Camera',
		sellerName: 'Seller',
		status: 'open',
		endsAt: new Date(Date.now() + HOUR),
		priceUsd: new Prisma.Decimal('12.50'),
		currentBidJpy: new Prisma.Decimal('1900'),
		exchangedAt: new Date('2026-10-01T00:00:00Z'),
		category: { code: 'cameras', label: 'Cameras' },
		...over,
	}) as never;

const rpcError = async (promise: Promise<unknown>) => {
	const error = await promise.then(
		() => undefined,
		(e) => e
	);
	expect(error).toBeInstanceOf(RpcException);
	return (error as RpcException).getError();
};

describe('YauctionsRpcService', () => {
	let products: {
		findAll: jest.Mock;
		findOne: jest.Mock;
		findLotsByCodes: jest.Mock;
	};
	let categories: { findAll: jest.Mock };
	let service: YauctionsRpcService;

	beforeEach(() => {
		products = {
			findAll: jest.fn(),
			findOne: jest.fn(),
			findLotsByCodes: jest.fn(),
		};
		categories = { findAll: jest.fn() };
		service = new YauctionsRpcService(products as never, categories as never);
	});

	describe('listProducts', () => {
		it('applies DTO defaults and delegates', async () => {
			products.findAll.mockResolvedValue({ data: [], pagination: {} });
			await service.listProducts({ q: 'cam', categories: 'a,b', page: '2' });
			expect(products.findAll).toHaveBeenCalledWith(
				expect.objectContaining({
					q: 'cam',
					categories: ['a', 'b'],
					page: 2,
					pageSize: 10,
					sort: 'ending',
				})
			);
		});

		it('accepts an empty payload', async () => {
			products.findAll.mockResolvedValue({ data: [] });
			await expect(service.listProducts(undefined)).resolves.toEqual({
				data: [],
			});
		});

		it.each([[{ sort: 'nope' }], [{ pageSize: 500 }], ['text'], [[1]]])(
			'rejects invalid payload %p',
			async (payload) => {
				expect(await rpcError(service.listProducts(payload))).toBe(
					'INVALID_PAYLOAD'
				);
				expect(products.findAll).not.toHaveBeenCalled();
			}
		);

		it('maps storage failures to YAUCTIONS_INTERNAL_ERROR', async () => {
			products.findAll.mockRejectedValue(new Error('db down'));
			expect(await rpcError(service.listProducts({}))).toBe(
				'YAUCTIONS_INTERNAL_ERROR'
			);
		});
	});

	describe('getProduct', () => {
		it('returns the product', async () => {
			products.findOne.mockResolvedValue({ data: { id: 'yac-1' } });
			await expect(service.getProduct({ code: 'yac-1' })).resolves.toEqual({
				data: { id: 'yac-1' },
			});
		});

		it('maps unknown code to PRODUCT_NOT_FOUND', async () => {
			products.findOne.mockRejectedValue(new NotFoundException());
			expect(await rpcError(service.getProduct({ code: 'x' }))).toBe(
				'PRODUCT_NOT_FOUND'
			);
		});

		it.each([[null], [{}], [{ code: '' }], [{ code: 'a'.repeat(65) }]])(
			'rejects invalid payload %p',
			async (payload) => {
				expect(await rpcError(service.getProduct(payload))).toBe(
					'INVALID_PAYLOAD'
				);
			}
		);

		it('maps unexpected failures', async () => {
			products.findOne.mockRejectedValue(new Error('boom'));
			expect(await rpcError(service.getProduct({ code: 'x' }))).toBe(
				'YAUCTIONS_INTERNAL_ERROR'
			);
		});
	});

	describe('validateProducts', () => {
		it('returns the catalog.products.validate shape', async () => {
			products.findLotsByCodes.mockResolvedValue([lot()]);
			const reply = await service.validateProducts({
				codes: ['yac-1', 'yac-1', 'yac-9'],
			});
			expect(products.findLotsByCodes).toHaveBeenCalledWith(['yac-1', 'yac-9']);
			expect(reply.items).toEqual([
				{
					code: 'yac-1',
					found: true,
					available: true,
					title: 'Camera',
					sellerName: 'Seller',
					status: 'in_auction',
					endsAt: expect.any(String),
					price: {
						usd: '12.5',
						jpy: '1900',
						exchangedAt: '2026-10-01T00:00:00.000Z',
					},
					category: { code: 'cameras', name: 'Cameras' },
				},
				{ code: 'yac-9', found: false, available: false, category: null },
			]);
		});

		it('flags ended and expired lots as unavailable', async () => {
			products.findLotsByCodes.mockResolvedValue([
				lot({ code: 'a', status: 'ended' }),
				lot({ code: 'b', endsAt: new Date(Date.now() - 1000) }),
			]);
			const { items } = await service.validateProducts({ codes: ['a', 'b'] });
			expect(items.map((i) => [i.found, i.available])).toEqual([
				[true, false],
				[true, false],
			]);
		});

		it.each([
			[null],
			[{}],
			[{ codes: [] }],
			[{ codes: [''] }],
			[{ codes: [1] }],
			[{ codes: ['a'.repeat(65)] }],
			[{ codes: Array.from({ length: 51 }, (_, i) => `c${i}`) }],
		])('rejects invalid payload %p', async (payload) => {
			expect(await rpcError(service.validateProducts(payload))).toBe(
				'INVALID_PAYLOAD'
			);
		});

		it('maps storage failures', async () => {
			products.findLotsByCodes.mockRejectedValue(new Error('db'));
			expect(await rpcError(service.validateProducts({ codes: ['a'] }))).toBe(
				'YAUCTIONS_INTERNAL_ERROR'
			);
		});
	});

	describe('listCategories', () => {
		it('delegates and maps failures', async () => {
			categories.findAll.mockResolvedValueOnce({ data: [] });
			await expect(service.listCategories()).resolves.toEqual({ data: [] });
			categories.findAll.mockRejectedValueOnce(new Error('db'));
			expect(await rpcError(service.listCategories())).toBe(
				'YAUCTIONS_INTERNAL_ERROR'
			);
		});
	});
});
