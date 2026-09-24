import { paginatedResponse, singleResponse } from '@/utils/response.util';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaClient } from 'prisma/generated/client';

@Injectable()
export class PermissionService {
	constructor(private readonly prisma: PrismaClient) {}

	async findAll(query?: Prisma.PermissionFindManyArgs) {
		const [data, count] = await Promise.all([
			this.prisma.permission.findMany(query),
			this.prisma.permission.count({ where: query?.where }),
		]);
		return paginatedResponse(data, count, query);
	}

	async findOne(
		id: number,
		query?: Omit<Prisma.PermissionFindUniqueArgs, 'where'>
	) {
		const data = await this.prisma.permission.findUnique({
			where: { id },
			...query,
		});
		if (!data) throw new NotFoundException('Permission not found');
		return singleResponse(data);
	}
}
