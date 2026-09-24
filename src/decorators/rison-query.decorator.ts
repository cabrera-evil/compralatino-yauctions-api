import { getPagination } from '@/utils/prisma.utils';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import * as rison from 'rison';

export const RisonQuery = createParamDecorator(
	(
		opts: { paginate: boolean } = { paginate: false },
		ctx: ExecutionContext
	): Record<string, unknown> => {
		try {
			const q = ctx.switchToHttp().getRequest().query.q ?? '';
			const { page, pageSize, ...rest } = q
				? (rison.decode(q) as Record<string, unknown>)
				: {};
			return opts.paginate
				? { ...rest, ...getPagination(page as number, pageSize as number) }
				: rest;
		} catch {
			return {};
		}
	}
);
