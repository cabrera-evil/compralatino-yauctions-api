import { singleResponse } from '@/utils/response.util';
import { Injectable } from '@nestjs/common';
import { PrismaClient } from 'prisma/generated/client';

@Injectable()
export class CategoryService {
	constructor(private readonly prisma: PrismaClient) {}

	async findAll() {
		const categories = await this.prisma.yacCategory.findMany({
			orderBy: { id: 'asc' },
			select: {
				code: true,
				label: true,
				_count: { select: { lots: { where: { status: 'open' } } } },
			},
		});
		return singleResponse(
			categories
				.map(({ code, label, _count }) => ({ code, label, count: _count.lots }))
				.filter(({ count }) => count > 0)
		);
	}
}
