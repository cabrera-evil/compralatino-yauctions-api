import { paginatedResponse, singleResponse } from '@/utils/response.util';
import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from 'prisma/generated/client';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

@Injectable()
export class AuditLogService {
	constructor(private readonly prisma: PrismaClient) {}

	async findAll(query?: Prisma.AuditLogFindManyArgs) {
		const [data, count] = await Promise.all([
			this.prisma.auditLog.findMany(query),
			this.prisma.auditLog.count({ where: query.where }),
		]);
		return paginatedResponse(data, count, query);
	}

	async findOne(
		id: number,
		query?: Omit<Prisma.AuditLogFindUniqueArgs, 'where'>
	) {
		const data = await this.prisma.auditLog.findUnique({
			where: { id },
			...query,
		});
		return singleResponse(data);
	}

	async createAuditLog(createAuditLogDto: CreateAuditLogDto) {
		return await this.prisma.auditLog.create({
			data: createAuditLogDto,
		});
	}
}
