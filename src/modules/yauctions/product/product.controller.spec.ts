import {
	INestApplication,
	NotFoundException,
	ValidationPipe,
	VersioningType,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { CategoryController } from '../category/category.controller';
import { CategoryService } from '../category/category.service';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';

describe('YAuctions HTTP controllers', () => {
	let app: INestApplication;
	let products: { findAll: jest.Mock; findOne: jest.Mock };
	let categories: { findAll: jest.Mock };

	beforeEach(async () => {
		products = { findAll: jest.fn(), findOne: jest.fn() };
		categories = { findAll: jest.fn() };
		const moduleRef = await Test.createTestingModule({
			controllers: [ProductController, CategoryController],
			providers: [
				{ provide: ProductService, useValue: products },
				{ provide: CategoryService, useValue: categories },
			],
		}).compile();
		app = moduleRef.createNestApplication();
		app.enableVersioning({ type: VersioningType.URI });
		app.useGlobalPipes(new ValidationPipe({ transform: true }));
		await app.init();
	});

	afterEach(() => app.close());

	it('GET products returns 200 and applies parsed query + defaults', async () => {
		products.findAll.mockResolvedValue({ data: [], pagination: {} });
		await request(app.getHttpServer())
			.get('/v1/yauctions/products?q=cam&categories=a,b&minPrice=5&page=2')
			.expect(200)
			.expect({ data: [], pagination: {} });
		expect(products.findAll).toHaveBeenCalledWith(
			expect.objectContaining({
				q: 'cam',
				categories: ['a', 'b'],
				minPrice: 5,
				page: 2,
				pageSize: 10,
				sort: 'ending',
			})
		);
	});

	it.each([
		['bad sort', 'sort=cheapest'],
		['page below minimum', 'page=0'],
		['pageSize above maximum', 'pageSize=51'],
		['non-numeric price', 'minPrice=abc'],
		['negative price', 'maxPrice=-1'],
	])('GET products returns 400 on invalid input: %s', async (_n, qs) => {
		await request(app.getHttpServer())
			.get(`/v1/yauctions/products?${qs}`)
			.expect(400);
		expect(products.findAll).not.toHaveBeenCalled();
	});

	it('GET product by code returns 200', async () => {
		products.findOne.mockResolvedValue({ data: { id: 'yac-1' } });
		await request(app.getHttpServer())
			.get('/v1/yauctions/products/yac-1')
			.expect(200)
			.expect({ data: { id: 'yac-1' } });
		expect(products.findOne).toHaveBeenCalledWith('yac-1');
	});

	it('GET product by code returns 404 when missing', async () => {
		products.findOne.mockRejectedValue(
			new NotFoundException('Product not found')
		);
		await request(app.getHttpServer())
			.get('/v1/yauctions/products/nope')
			.expect(404);
	});

	it('GET categories returns 200', async () => {
		categories.findAll.mockResolvedValue({ data: [] });
		await request(app.getHttpServer())
			.get('/v1/yauctions/categories')
			.expect(200)
			.expect({ data: [] });
	});
});
