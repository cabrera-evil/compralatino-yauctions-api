import { RpcException } from '@nestjs/microservices';
import { YauctionsRpcController } from './yauctions-rpc.controller';

describe('YauctionsRpcController', () => {
	let rpc: Record<
		'listProducts' | 'getProduct' | 'validateProducts' | 'listCategories',
		jest.Mock
	>;
	let controller: YauctionsRpcController;

	beforeEach(() => {
		rpc = {
			listProducts: jest.fn(),
			getProduct: jest.fn(),
			validateProducts: jest.fn(),
			listCategories: jest.fn(),
		};
		controller = new YauctionsRpcController(rpc as never);
	});

	it('delegates each pattern to the service and returns its reply', async () => {
		rpc.listProducts.mockResolvedValue('list');
		rpc.getProduct.mockResolvedValue('get');
		rpc.validateProducts.mockResolvedValue('validate');
		rpc.listCategories.mockResolvedValue('cats');
		await expect(controller.listProducts({ q: 'a' })).resolves.toBe('list');
		await expect(controller.getProduct({ code: 'x' })).resolves.toBe('get');
		await expect(controller.validateProducts({ codes: [] })).resolves.toBe(
			'validate'
		);
		await expect(controller.listCategories()).resolves.toBe('cats');
		expect(rpc.listProducts).toHaveBeenCalledWith({ q: 'a' });
		expect(rpc.getProduct).toHaveBeenCalledWith({ code: 'x' });
	});

	it('propagates RpcException error payloads for invalid input', async () => {
		rpc.getProduct.mockRejectedValue(new RpcException('INVALID_PAYLOAD'));
		const error = await controller.getProduct(null).catch((e) => e);
		expect(error).toBeInstanceOf(RpcException);
		expect((error as RpcException).getError()).toBe('INVALID_PAYLOAD');
	});
});
