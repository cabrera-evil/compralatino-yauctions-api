import { Test, TestingModule } from '@nestjs/testing';
import {
	YAUCTIONS_CATEGORIES_LIST_PATTERN,
	YAUCTIONS_PRODUCTS_GET_PATTERN,
	YAUCTIONS_PRODUCTS_LIST_PATTERN,
	YAUCTIONS_PRODUCTS_VALIDATE_PATTERN,
} from '../src/constants/rabbitmq';
import { YauctionsRpcController } from '../src/modules/yauctions-rpc/yauctions-rpc.controller';
import { YauctionsRpcService } from '../src/modules/yauctions-rpc/yauctions-rpc.service';

// The full AppModule needs Postgres/RabbitMQ (unavailable in CI sandbox), so
// this suite wires the RPC controller against stubbed services and asserts the
// RabbitMQ contract: registered patterns and payload pass-through.
describe('Yauctions RPC contract (e2e)', () => {
	let controller: YauctionsRpcController;
	const rpc = {
		listProducts: jest.fn().mockReturnValue('list'),
		getProduct: jest.fn().mockReturnValue('get'),
		validateProducts: jest.fn().mockReturnValue('validate'),
		listCategories: jest.fn().mockReturnValue('categories'),
	};

	beforeAll(async () => {
		const moduleRef: TestingModule = await Test.createTestingModule({
			controllers: [YauctionsRpcController],
			providers: [{ provide: YauctionsRpcService, useValue: rpc }],
		}).compile();
		controller = moduleRef.get(YauctionsRpcController);
	});

	it.each([
		['listProducts', YAUCTIONS_PRODUCTS_LIST_PATTERN],
		['getProduct', YAUCTIONS_PRODUCTS_GET_PATTERN],
		['validateProducts', YAUCTIONS_PRODUCTS_VALIDATE_PATTERN],
		['listCategories', YAUCTIONS_CATEGORIES_LIST_PATTERN],
	])('%s is bound to %s', (method, pattern) => {
		const handler = (controller as never as Record<string, unknown>)[method];
		expect(
			Reflect.getMetadata('microservices:pattern', handler as object)
		).toEqual([pattern]);
	});

	it('forwards payloads to the services', () => {
		expect(controller.validateProducts({ codes: ['a'] })).toBe('validate');
		expect(rpc.validateProducts).toHaveBeenCalledWith({ codes: ['a'] });
	});
});
