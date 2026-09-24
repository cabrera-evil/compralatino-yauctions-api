import { PERMISSIONS_KEY } from '@/decorators/permissions.decorator';
import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaClient } from 'prisma/generated/client';

@Injectable()
export class PermissionGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly prisma: PrismaClient
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const required = this.reflector.getAllAndOverride<string[]>(
			PERMISSIONS_KEY,
			[context.getHandler(), context.getClass()]
		);

		if (!required || required.length === 0) return true;

		const request = context.switchToHttp().getRequest();
		if (!request?.user) return false;

		const user = await this.prisma.user.findUnique({
			where: { id: request.user.id },
			include: {
				roles: {
					include: {
						rolePermissions: {
							include: { permission: true },
						},
					},
				},
			},
		});

		if (!user) return false;

		const granted = new Set(
			user.roles.flatMap((role) =>
				role.rolePermissions.map((rp) => rp.permission.code)
			)
		);

		if (!required.some((p) => granted.has(p))) {
			throw new ForbiddenException('INSUFFICIENT_PERMISSIONS');
		}

		return true;
	}
}
