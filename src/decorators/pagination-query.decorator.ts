import { getPagination } from '@/utils/prisma.utils';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const PaginationQuery = createParamDecorator(
	(
		opts: { paginate: boolean } = { paginate: false },
		ctx: ExecutionContext
	): Record<string, unknown> => {
		const query =
			(ctx.switchToHttp().getRequest().query as Record<string, unknown>) ?? {};
		const { page, pageSize, ...rest } = query;

		if (!opts.paginate) {
			return rest;
		}

		const pageNumber = Number(page);
		const pageSizeNumber = Number(pageSize);
		const pagination = getPagination(
			Number.isFinite(pageNumber) ? pageNumber : undefined,
			Number.isFinite(pageSizeNumber) ? pageSizeNumber : undefined
		);

		return { ...rest, ...pagination };
	}
);
