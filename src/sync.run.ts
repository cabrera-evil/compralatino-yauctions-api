import { Logger } from '@nestjs/common';
import { existsSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { loadYacConfig } from './modules/yauctions/config/yac.config';
import type { YacLotRepository } from './modules/yauctions/sync/yac-lot.repository';
import { YauctionsSyncService } from './modules/yauctions/sync/yauctions-sync.service';

const parsePositive = (name: string, value?: string): number | undefined => {
	if (value === undefined) return undefined;
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed < 1)
		throw new Error(`--${name} must be a positive integer`);
	return parsed;
};

const loadRepository = async (): Promise<{
	repository: YacLotRepository;
	close: () => Promise<void>;
}> => {
	// Imported lazily so a dry-run never opens a database connection.
	const { PrismaProvider } = await import('./modules/prisma/prisma.service');
	const { YacLotRepository: Repository } =
		await import('./modules/yauctions/sync/yac-lot.repository');
	const prisma = await PrismaProvider.useFactory();
	return {
		repository: new Repository(prisma),
		close: () => prisma.$disconnect(),
	};
};

async function main(): Promise<void> {
	if (existsSync('.env')) process.loadEnvFile('.env');
	const { values } = parseArgs({
		args: process.argv.slice(2).filter((arg) => arg !== '--'),
		options: {
			apply: { type: 'boolean', default: false },
			'dry-run': { type: 'boolean', default: false },
			'max-auctions': { type: 'string' },
			'max-lots': { type: 'string' },
		},
		strict: true,
	});
	if (values.apply && values['dry-run'])
		throw new Error('--apply and --dry-run are mutually exclusive');

	const apply = values.apply;
	const db = apply ? await loadRepository() : undefined;
	try {
		const service = new YauctionsSyncService(loadYacConfig(), db?.repository);
		const report = await service.run({
			apply,
			maxAuctions: parsePositive('max-auctions', values['max-auctions']),
			maxLots: parsePositive('max-lots', values['max-lots']),
		});
		process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
	} finally {
		await db?.close();
	}
}

main().catch((error: unknown) => {
	new Logger('sync:yauctions').error(
		error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown error'
	);
	process.exitCode = 1;
});
