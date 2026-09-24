import { PermissionCode } from '@/constants/permissions';
import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: PermissionCode[]) =>
	SetMetadata(PERMISSIONS_KEY, permissions);
