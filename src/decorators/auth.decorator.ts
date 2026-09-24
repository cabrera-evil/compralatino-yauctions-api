import { PermissionCode } from '@/constants/permissions';
import { RequirePermissions } from '@/decorators/permissions.decorator';
import { PermissionGuard } from '@/guards/permission.guard';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { UseGuards, applyDecorators } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

/**
 * Composite decorator: JWT auth + optional permission check + Swagger lock.
 *
 * Usage:
 *   @Auth()                          — authenticated, no permission check
 *   @Auth('users:read')              — authenticated + requires users:read
 *   @Auth('users:read', 'roles:read') — requires either permission
 */
export const Auth = (...permissions: PermissionCode[]) =>
	applyDecorators(
		RequirePermissions(...permissions),
		UseGuards(JwtAuthGuard, PermissionGuard),
		ApiBearerAuth()
	);
