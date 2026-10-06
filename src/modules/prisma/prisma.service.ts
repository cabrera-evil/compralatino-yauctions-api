import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from 'prisma/generated/client';

// A malformed URL yields no schema; the connect-time failure reports it.
const resolveSchema = (url?: string): string | undefined => {
	if (!url) return undefined;
	try {
		return new URL(url).searchParams.get('schema') ?? undefined;
	} catch {
		return undefined;
	}
};

export const adapter = new PrismaPg(
	{ connectionString: process.env.DATABASE_URL },
	{ schema: resolveSchema(process.env.DATABASE_URL) }
);

export const PrismaProvider = {
	provide: PrismaClient,
	useFactory: async () => {
		const prisma = new PrismaClient({
			adapter,
			log: [
				{ emit: 'event', level: 'query' },
				{ emit: 'stdout', level: 'error' },
				{ emit: 'stdout', level: 'info' },
				{ emit: 'stdout', level: 'warn' },
			],
		});
		await prisma.$connect();
		return prisma;
	},
};

@Injectable()
export class PrismaShutdown implements OnModuleDestroy {
	constructor(private readonly prisma: PrismaClient) {}
	async onModuleDestroy() {
		await this.prisma.$disconnect();
	}
}
