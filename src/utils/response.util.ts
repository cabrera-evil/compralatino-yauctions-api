import { ApiResponse } from '@/types/api-response.type';
import { getPaginationMeta } from './prisma.utils';

/**
 * Creates a paginated response from data, count, and query parameters
 * @param data - The array of data returned from findMany
 * @param count - The total count from count query
 * @param query - The query object containing take/skip pagination params
 * @returns Object with data and pagination metadata
 */
export function paginatedResponse<T>(
	data: T[],
	count: number = 0,
	query?: any
): ApiResponse<T[]> {
	const pagination = getPaginationMeta(query?.take, query?.skip, count);
	return {
		data,
		pagination,
	};
}

/**
 * Creates a simple data response wrapper
 * @param data - The data to wrap
 * @returns Object with data property
 */
export function singleResponse<T>(data: T): { data: T } {
	return { data };
}
