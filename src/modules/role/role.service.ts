import { paginatedResponse, singleResponse } from '@/utils/response.util';
import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { Prisma, PrismaClient } from 'prisma/generated/client';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RoleService {
	constructor(private readonly prisma: PrismaClient) {}

	private roleInclude = {
		rolePermissions: {
			include: { permission: true },
		},
	} satisfies Prisma.RoleInclude;

	async findAll(query?: Prisma.RoleFindManyArgs) {
		const [data, count] = await Promise.all([
			this.prisma.role.findMany({ include: this.roleInclude, ...query }),
			this.prisma.role.count({ where: query?.where }),
		]);
		return paginatedResponse(data, count, query);
	}

	async findOne(id: number, query?: Omit<Prisma.RoleFindUniqueArgs, 'where'>) {
		const data = await this.prisma.role.findUnique({
			where: { id },
			include: this.roleInclude,
			...query,
		});
		if (!data) throw new NotFoundException('Role not found');
		return singleResponse(data);
	}

	async create(dto: CreateRoleDto) {
		const data = await this.prisma.role.create({ data: dto });
		return singleResponse(data);
	}

	async update(id: number, dto: UpdateRoleDto) {
		const role = await this.prisma.role.findUnique({ where: { id } });
		if (!role) throw new NotFoundException('Role not found');
		const data = await this.prisma.role.update({ where: { id }, data: dto });
		return singleResponse(data);
	}

	async remove(id: number) {
		const role = await this.prisma.role.findUnique({ where: { id } });
		if (!role) throw new NotFoundException('Role not found');
		if (role.isSystem)
			throw new BadRequestException('System roles cannot be deleted');
		await this.prisma.role.delete({ where: { id } });
		return singleResponse(role);
	}

	async assignPermissions(roleId: number, permissionIds: number[]) {
		const role = await this.prisma.role.findUnique({ where: { id: roleId } });
		if (!role) throw new NotFoundException('Role not found');

		await this.prisma.rolePermission.createMany({
			data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
			skipDuplicates: true,
		});

		return this.findOne(roleId);
	}

	async revokePermissions(roleId: number, permissionIds: number[]) {
		const role = await this.prisma.role.findUnique({ where: { id: roleId } });
		if (!role) throw new NotFoundException('Role not found');

		await this.prisma.rolePermission.deleteMany({
			where: { roleId, permissionId: { in: permissionIds } },
		});

		return this.findOne(roleId);
	}

	async assignToUser(roleId: number, userId: number) {
		const role = await this.prisma.role.findUnique({ where: { id: roleId } });
		if (!role) throw new NotFoundException('Role not found');

		await this.prisma.user.update({
			where: { id: userId },
			data: { roles: { connect: { id: roleId } } },
		});

		return singleResponse({ userId, roleId });
	}

	async revokeFromUser(roleId: number, userId: number) {
		const role = await this.prisma.role.findUnique({ where: { id: roleId } });
		if (!role) throw new NotFoundException('Role not found');

		await this.prisma.user.update({
			where: { id: userId },
			data: { roles: { disconnect: { id: roleId } } },
		});

		return singleResponse({ userId, roleId });
	}
}
