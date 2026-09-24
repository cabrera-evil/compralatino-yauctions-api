import { hashPassword } from '@/utils/bcrypt.util';
import { Prisma, PrismaClient } from 'prisma/generated/client';
import { Provider } from 'prisma/generated/enums';

const bulk: Prisma.UserCreateInput[] = [
	{
		username: process.env.ADMIN_USERNAME,
		firstName: process.env.ADMIN_FIRSTNAME,
		lastName: process.env.ADMIN_LASTNAME,
		email: process.env.ADMIN_EMAIL,
		password: process.env.ADMIN_PASSWORD,
		provider: Provider.LOCAL,
		emailVerified: true,
		profileCompleted: true,
	},
];

export const seedUsers = async (prisma: PrismaClient) => {
	console.log('[seed:users] seeding...');
	const seeded = [];

	const superAdminRole = await prisma.role.findUnique({
		where: { name: 'super-admin' },
	});

	for (const item of bulk) {
		const hashedPassword = await hashPassword(item.password);
		const data = {
			username: item.username,
			firstName: item.firstName,
			lastName: item.lastName,
			email: item.email,
			password: hashedPassword,
			provider: item.provider,
			emailVerified: item.emailVerified,
			emailVerifiedAt: item.emailVerified ? new Date() : null,
			profileCompleted: item.profileCompleted,
		};

		const user = await prisma.user.upsert({
			where: { username: item.username },
			update: data,
			create: data,
		});

		if (superAdminRole) {
			await prisma.user.update({
				where: { id: user.id },
				data: { roles: { connect: { id: superAdminRole.id } } },
			});
		}

		seeded.push(user);
		console.log(
			`[seed:users] upserted user=${user.username} email=${user.email}`
		);
	}

	return seeded;
};
