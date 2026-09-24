import { AppPermissions } from '@/constants/permissions';
import { Auth } from '@/decorators/auth.decorator';
import { RisonQuery } from '@/decorators/rison-query.decorator';
import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Prisma } from 'prisma/generated/client';
import { AuditLogService } from './audit-log.service';

@ApiTags('audit-log')
@Controller({ path: 'audit-log', version: '1' })
export class AuditLogController {
	constructor(private readonly auditLogService: AuditLogService) {}

	@Auth(AppPermissions.AUDIT_LOGS_READ)
	@Get()
	findAll(@RisonQuery({ paginate: true }) query?: Prisma.AuditLogFindManyArgs) {
		return this.auditLogService.findAll(query);
	}

	@Auth(AppPermissions.AUDIT_LOGS_READ)
	@Get(':id')
	findOne(
		@Param('id') id: number,
		@RisonQuery() query?: Omit<Prisma.AuditLogFindUniqueArgs, 'where'>
	) {
		return this.auditLogService.findOne(id, query);
	}
}
