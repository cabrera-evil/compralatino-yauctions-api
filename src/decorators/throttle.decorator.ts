/**
 * Override rate limits for specific route
 *
 * @example
 * ```typescript
 * import { Throttle } from '@/decorators/throttle.decorator';
 *
 * @Throttle({ default: { limit: 3, ttl: 60000 } })
 * @Get('expensive-operation')
 * expensiveOperation() {
 *   // This endpoint allows only 3 requests per minute
 * }
 * ```
 *
 * @example
 * ```typescript
 * import { Throttle } from '@/decorators/throttle.decorator';
 *
 * @Throttle({ short: { limit: 5, ttl: 1000 } })
 * @Post('login')
 * login() {
 *   // Override only the short throttler for login endpoint
 * }
 * ```
 */
export { Throttle } from '@nestjs/throttler';

/**
 * Skip rate limiting for specific route or controller
 *
 * @example
 * ```typescript
 * import { SkipThrottle } from '@/decorators/throttle.decorator';
 *
 * @SkipThrottle()
 * @Get('health')
 * healthCheck() {
 *   // This endpoint is not rate limited
 * }
 * ```
 *
 * @example
 * ```typescript
 * import { SkipThrottle } from '@/decorators/throttle.decorator';
 *
 * @SkipThrottle()
 * @Controller('public')
 * export class PublicController {
 *   // All routes in this controller skip rate limiting
 * }
 * ```
 */
export { SkipThrottle } from '@nestjs/throttler';
