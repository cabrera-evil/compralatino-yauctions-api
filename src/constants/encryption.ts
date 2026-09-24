/**
 * Content types that should skip encryption
 * These typically involve binary data or special handling
 */
export const ENCRYPTION_SKIP_CONTENT_TYPES = new Set([
	'multipart/form-data',
	'application/octet-stream',
	'image/',
	'video/',
	'audio/',
	'application/pdf',
]);

/**
 * Routes that should always skip encryption
 * Health checks, metrics, and infrastructure endpoints
 */
export const ENCRYPTION_SKIP_ROUTES = new Set([
	'/api/health',
	'/api/metrics',
	'/api-json', // Swagger JSON endpoint
	'/api-yaml', // Swagger YAML endpoint
]);

/**
 * HTTP methods that typically don't have request bodies
 * Still need response encryption
 */
export const BODYLESS_METHODS = new Set(['GET', 'HEAD', 'DELETE', 'OPTIONS']);
