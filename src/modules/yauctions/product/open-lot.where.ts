import type { Prisma } from 'prisma/generated/client';

// Lots served publicly: flagged open and not past their end time.
export const openLotWhere = (now = new Date()): Prisma.YacLotWhereInput => ({
	status: 'open',
	endsAt: { gt: now },
});
