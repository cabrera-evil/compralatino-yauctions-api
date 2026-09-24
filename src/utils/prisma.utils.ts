export const getPagination = (page = 1, pageSize = 10) => {
	const safePage = Math.max(1, +page);
	const safeSize = Math.max(1, +pageSize);
	return {
		take: safeSize,
		skip: (safePage - 1) * safeSize,
	};
};

export const getPaginationMeta = (take = 10, skip = 0, total = 0) => ({
	page: Math.floor(skip / take) + 1,
	pageSize: take,
	total,
	pageCount: Math.ceil(total / take),
});
