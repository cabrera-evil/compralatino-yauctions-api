export type ApiResponse<T = unknown> = {
	data?: T;
	pagination?: ApiPagination;
};

export type ApiPagination = {
	page: number;
	pageSize: number;
	total: number;
	pageCount: number;
};
