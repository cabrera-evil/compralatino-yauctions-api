import { adapter } from '@/modules/prisma/prisma.service';
import { PrismaClient } from 'prisma/generated/client';
import { seedFiles } from './files';
import { seedPermissions } from './permissions';
import { seedRoles } from './roles';
import { seedUsers } from './users';

const prisma = new PrismaClient({
	adapter,
	log: [
		{ emit: 'event', level: 'query' },
		{ emit: 'stdout', level: 'error' },
		{ emit: 'stdout', level: 'info' },
		{ emit: 'stdout', level: 'warn' },
	],
});

const checkUserEnvironment = () => {
	if (
		!process.env.ADMIN_USERNAME ||
		!process.env.ADMIN_EMAIL ||
		!process.env.ADMIN_PASSWORD
	) {
		console.warn(
			'[seed:users] ADMIN_USERNAME, ADMIN_EMAIL, or ADMIN_PASSWORD not set — skipping admin user'
		);
		return false;
	}
	return true;
};

const main = async () => {
	console.log('[seed] starting...');
	try {
		// Order matters: permissions → roles (references permissions) → files → users (references roles + files)
		await seedPermissions(prisma);
		await seedRoles(prisma);
		await seedFiles(prisma);

		const hasUsers = checkUserEnvironment();
		if (hasUsers) await seedUsers(prisma);

		const [permissionCount, roleCount, userCount, fileCount] =
			await Promise.all([
				prisma.permission.count(),
				prisma.role.count(),
				hasUsers ? prisma.user.count() : Promise.resolve(0),
				prisma.file.count(),
			]);

		console.log('[seed] done');
		console.log(
			`[seed] permissions=${permissionCount} roles=${roleCount} users=${userCount} files=${fileCount}`
		);
	} catch (error) {
		console.error('[seed] failed', error);
		throw error;
	}
};

main()
	.catch((error) => {
		console.error('[seed] fatal error', error);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
