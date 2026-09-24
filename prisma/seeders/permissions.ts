import { PrismaClient } from 'prisma/generated/client';

const permissionData: Array<{
	code: string;
	description: string;
	resource: string;
	action: string;
}> = [
	// Users
	{
		code: 'users:create',
		description: 'Create new users',
		resource: 'users',
		action: 'create',
	},
	{
		code: 'users:read',
		description: 'Read user records',
		resource: 'users',
		action: 'read',
	},
	{
		code: 'users:update',
		description: 'Update user records',
		resource: 'users',
		action: 'update',
	},
	{
		code: 'users:delete',
		description: 'Delete user records',
		resource: 'users',
		action: 'delete',
	},
	// Roles
	{
		code: 'roles:create',
		description: 'Create new roles',
		resource: 'roles',
		action: 'create',
	},
	{
		code: 'roles:read',
		description: 'Read role records',
		resource: 'roles',
		action: 'read',
	},
	{
		code: 'roles:update',
		description: 'Update roles and assign permissions/users',
		resource: 'roles',
		action: 'update',
	},
	{
		code: 'roles:delete',
		description: 'Delete non-system roles',
		resource: 'roles',
		action: 'delete',
	},
	// Permissions
	{
		code: 'permissions:read',
		description: 'Read permission records',
		resource: 'permissions',
		action: 'read',
	},
	// Audit logs
	{
		code: 'audit-logs:read',
		description: 'Read audit log records',
		resource: 'audit-logs',
		action: 'read',
	},
	// API keys (admin view)
	{
		code: 'api-keys:read-all',
		description: 'List all API keys across users',
		resource: 'api-keys',
		action: 'read-all',
	},
	// Files
	{
		code: 'files:create',
		description: 'Upload files',
		resource: 'files',
		action: 'create',
	},
	{
		code: 'files:read',
		description: 'Read file records',
		resource: 'files',
		action: 'read',
	},
	{
		code: 'files:delete',
		description: 'Delete files',
		resource: 'files',
		action: 'delete',
	},
];

export const seedPermissions = async (prisma: PrismaClient) => {
	console.log('[seed:permissions] seeding...');
	const seeded = [];
	for (const item of permissionData) {
		const permission = await prisma.permission.upsert({
			where: { code: item.code },
			update: { description: item.description },
			create: item,
		});
		seeded.push(permission);
	}
	console.log(`[seed:permissions] upserted ${seeded.length}`);
	return seeded;
};
