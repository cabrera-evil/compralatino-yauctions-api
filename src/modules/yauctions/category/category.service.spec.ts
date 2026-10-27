import { CategoryService } from './category.service';

describe('CategoryService', () => {
	it('maps counts and drops categories without open lots', async () => {
		const findMany = jest.fn().mockResolvedValue([
			{ code: 'a', label: 'A', _count: { lots: 2 } },
			{ code: 'b', label: 'B', _count: { lots: 0 } },
		]);
		const service = new CategoryService({ yacCategory: { findMany } } as never);
		await expect(service.findAll()).resolves.toEqual({
			data: [{ code: 'a', label: 'A', count: 2 }],
		});
	});

	it('propagates persistence errors', async () => {
		const findMany = jest.fn().mockRejectedValue(new Error('db'));
		const service = new CategoryService({ yacCategory: { findMany } } as never);
		await expect(service.findAll()).rejects.toThrow('db');
	});
});
