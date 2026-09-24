import { AppPermissions } from '@/constants/permissions';
import { Auth } from '@/decorators/auth.decorator';
import { RisonQuery } from '@/decorators/rison-query.decorator';
import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	ParseIntPipe,
	Patch,
	Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Prisma } from 'prisma/generated/client';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleService } from './role.service';

@ApiTags('roles')
@Controller({ path: 'roles', version: '1' })
export class RoleController {
	constructor(private readonly roleService: RoleService) {}

	@Auth(AppPermissions.ROLES_READ)
	@ApiOperation({ summary: 'List all roles' })
	@Get()
	findAll(@RisonQuery({ paginate: true }) query?: Prisma.RoleFindManyArgs) {
		return this.roleService.findAll(query);
	}

	@Auth(AppPermissions.ROLES_READ)
	@ApiOperation({ summary: 'Get a role by ID' })
	@Get(':id')
	findOne(
		@Param('id', ParseIntPipe) id: number,
		@RisonQuery() query?: Omit<Prisma.RoleFindUniqueArgs, 'where'>
	) {
		return this.roleService.findOne(id, query);
	}

	@Auth(AppPermissions.ROLES_CREATE)
	@ApiOperation({ summary: 'Create a role' })
	@Post()
	create(@Body() dto: CreateRoleDto) {
		return this.roleService.create(dto);
	}

	@Auth(AppPermissions.ROLES_UPDATE)
	@ApiOperation({ summary: 'Update a role' })
	@Patch(':id')
	update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoleDto) {
		return this.roleService.update(id, dto);
	}

	@Auth(AppPermissions.ROLES_DELETE)
	@ApiOperation({ summary: 'Delete a role (non-system only)' })
	@Delete(':id')
	remove(@Param('id', ParseIntPipe) id: number) {
		return this.roleService.remove(id);
	}

	@Auth(AppPermissions.ROLES_UPDATE)
	@ApiOperation({ summary: 'Assign permissions to a role' })
	@Post(':id/permissions')
	assignPermissions(
		@Param('id', ParseIntPipe) id: number,
		@Body() dto: AssignPermissionsDto
	) {
		return this.roleService.assignPermissions(id, dto.permissionIds);
	}

	@Auth(AppPermissions.ROLES_UPDATE)
	@ApiOperation({ summary: 'Revoke permissions from a role' })
	@Delete(':id/permissions')
	revokePermissions(
		@Param('id', ParseIntPipe) id: number,
		@Body() dto: AssignPermissionsDto
	) {
		return this.roleService.revokePermissions(id, dto.permissionIds);
	}

	@Auth(AppPermissions.ROLES_UPDATE)
	@ApiOperation({ summary: 'Assign a role to a user' })
	@Post(':id/users/:userId')
	assignToUser(
		@Param('id', ParseIntPipe) id: number,
		@Param('userId', ParseIntPipe) userId: number
	) {
		return this.roleService.assignToUser(id, userId);
	}

	@Auth(AppPermissions.ROLES_UPDATE)
	@ApiOperation({ summary: 'Revoke a role from a user' })
	@Delete(':id/users/:userId')
	revokeFromUser(
		@Param('id', ParseIntPipe) id: number,
		@Param('userId', ParseIntPipe) userId: number
	) {
		return this.roleService.revokeFromUser(id, userId);
	}
}
