import { PrismaClient } from 'prisma/generated/client';

type RoleDefinition = {
	name: string;
	description: string;
	isSystem: boolean;
	permissions: string[];
};

const ALL_PERMISSIONS = [
	'users:create',
	'users:read',
	'users:update',
	'users:delete',
	'roles:create',
	'roles:read',
	'roles:update',
	'roles:delete',
	'permissions:read',
	'audit-logs:read',
	'api-keys:read-all',
	'files:create',
	'files:read',
	'files:delete',
];

const roleDefinitions: RoleDefinition[] = [
	{
		name: 'super-admin',
		description: 'Full access to all resources and system configuration',
		isSystem: true,
		permissions: ALL_PERMISSIONS,
	},
	{
		name: 'admin',
		description: 'Administrative access to users, audit logs, and API keys',
		isSystem: true,
		permissions: [
			'users:create',
			'users:read',
			'users:update',
			'users:delete',
			'roles:read',
			'permissions:read',
			'audit-logs:read',
			'api-keys:read-all',
			'files:create',
			'files:read',
			'files:delete',
		],
	},
	{
		name: 'user',
		description: 'Default role for registered users with no elevated access',
		isSystem: true,
		permissions: [],
	},
];

export const seedRoles = async (prisma: PrismaClient) => {
	console.log('[seed:roles] seeding...');
	const seeded = [];

	for (const def of roleDefinitions) {
		const role = await prisma.role.upsert({
			where: { name: def.name },
			update: { description: def.description, isSystem: def.isSystem },
			create: {
				name: def.name,
				description: def.description,
				isSystem: def.isSystem,
			},
		});

		if (def.permissions.length > 0) {
			const permissions = await prisma.permission.findMany({
				where: { code: { in: def.permissions } },
			});

			await prisma.rolePermission.createMany({
				data: permissions.map((p) => ({
					roleId: role.id,
					permissionId: p.id,
				})),
				skipDuplicates: true,
			});
		}

		seeded.push(role);
		console.log(
			`[seed:roles] upserted role=${role.name} permissions=${def.permissions.length}`
		);
	}

	return seeded;
};
