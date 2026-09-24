import { AppPermissions } from '@/constants/permissions';
import { Auth } from '@/decorators/auth.decorator';
import { RisonQuery } from '@/decorators/rison-query.decorator';
import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Prisma } from 'prisma/generated/client';
import { PermissionService } from './permission.service';

@ApiTags('permissions')
@Controller({ path: 'permissions', version: '1' })
export class PermissionController {
	constructor(private readonly permissionService: PermissionService) {}

	@Auth(AppPermissions.PERMISSIONS_READ)
	@ApiOperation({ summary: 'List all permissions' })
	@Get()
	findAll(
		@RisonQuery({ paginate: true }) query?: Prisma.PermissionFindManyArgs
	) {
		return this.permissionService.findAll(query);
	}

	@Auth(AppPermissions.PERMISSIONS_READ)
	@ApiOperation({ summary: 'Get a permission by ID' })
	@Get(':id')
	findOne(
		@Param('id', ParseIntPipe) id: number,
		@RisonQuery() query?: Omit<Prisma.PermissionFindUniqueArgs, 'where'>
	) {
		return this.permissionService.findOne(id, query);
	}
}
