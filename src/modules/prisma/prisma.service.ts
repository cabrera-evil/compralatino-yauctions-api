import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from 'prisma/generated/client';

const resolveSchema = (url?: string): string | undefined =>
	url ? (new URL(url).searchParams.get('schema') ?? undefined) : undefined;

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
