import { NotFoundException } from '@nestjs/common';
import { Prisma } from 'prisma/generated/client';
import { ProductService } from './product.service';

const lot = (over: Record<string, unknown> = {}) => ({
	code: 'yac-1',
	title: 'Camera',
	bids: 3,
	imageUrl: null,
	sellerName: 'Seller',
	location: 'Tokyo',
	status: 'open',
	startsAt: new Date('2026-10-01T00:00:00Z'),
	endsAt: new Date('2026-12-01T00:00:00Z'),
	priceUsd: new Prisma.Decimal('12.50'),
	currentBidJpy: new Prisma.Decimal('1900'),
	minIncrementUsd: new Prisma.Decimal('0.50'),
	minIncrementJpy: new Prisma.Decimal('75'),
	exchangedAt: null,
	photos: [],
	descriptionParagraphs: ['d'],
	specs: [],
	shipping: [],
	category: { code: 'cameras', label: 'Cameras' },
	...over,
});

describe('ProductService', () => {
	let prisma: {
		yacLot: { findMany: jest.Mock; count: jest.Mock; findFirst: jest.Mock };
	};
	let service: ProductService;

	beforeEach(() => {
		prisma = {
			yacLot: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn() },
		};
		service = new ProductService(prisma as never);
	});

	it('findAll builds filters, paging and serializes with pagination', async () => {
		prisma.yacLot.findMany.mockResolvedValue([lot()]);
		prisma.yacLot.count.mockResolvedValue(25);
		const res = await service.findAll({
			q: 'old cam',
			categories: ['cameras'],
			minPrice: 5,
			maxPrice: 50,
			sort: 'price-desc',
			page: 2,
			pageSize: 10,
		});
		const args = prisma.yacLot.findMany.mock.calls[0][0];
		expect(args.take).toBe(10);
		expect(args.skip).toBe(10);
		expect(args.orderBy).toEqual([{ priceUsd: 'desc' }, { id: 'asc' }]);
		expect(args.where.status).toBe('open');
		expect(args.where.category).toEqual({ code: { in: ['cameras'] } });
		expect(args.where.priceUsd).toEqual({ gte: 5, lte: 50 });
		expect(args.where.AND).toHaveLength(2);
		expect(res.data).toHaveLength(1);
		expect(res.data[0]).toMatchObject({ id: 'yac-1', categoryCode: 'cameras' });
		expect(res.pagination).toMatchObject({ total: 25 });
	});

	it('findAll omits optional filters when absent', async () => {
		prisma.yacLot.findMany.mockResolvedValue([]);
		prisma.yacLot.count.mockResolvedValue(0);
		await service.findAll({ sort: 'ending', page: 1, pageSize: 10 });
		const { where } = prisma.yacLot.findMany.mock.calls[0][0];
		expect(where.category).toBeUndefined();
		expect(where.priceUsd).toBeUndefined();
		expect(where.AND).toEqual([]);
	});

	it('findAll propagates persistence errors', async () => {
		prisma.yacLot.findMany.mockRejectedValue(new Error('db'));
		prisma.yacLot.count.mockResolvedValue(0);
		await expect(
			service.findAll({ sort: 'ending', page: 1, pageSize: 10 })
		).rejects.toThrow('db');
	});

	it('findOne returns the serialized detail', async () => {
		prisma.yacLot.findFirst.mockResolvedValue(lot());
		const res = await service.findOne('yac-1');
		expect(res.data).toMatchObject({ id: 'yac-1', categoryLabel: 'Cameras' });
	});

	it('findOne throws NotFound for unknown or ended lots', async () => {
		prisma.yacLot.findFirst.mockResolvedValue(null);
		await expect(service.findOne('nope')).rejects.toBeInstanceOf(
			NotFoundException
		);
	});

	it('findLotsByCodes queries by code without open filter', async () => {
		prisma.yacLot.findMany.mockResolvedValue([]);
		await service.findLotsByCodes(['a', 'b']);
		expect(prisma.yacLot.findMany.mock.calls[0][0].where).toEqual({
			code: { in: ['a', 'b'] },
		});
	});
});
