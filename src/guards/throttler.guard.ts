import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard as NestThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

/**
 * Custom Throttler Guard with proxy support
 *
 * Extends the default ThrottlerGuard to handle requests behind proxies
 * by extracting the real client IP from X-Forwarded-For headers
 */
@Injectable()
export class ThrottlerGuard extends NestThrottlerGuard {
	async canActivate(context: ExecutionContext): Promise<boolean> {
		const isThrottleEnabled = process.env.THROTTLE_ENABLED === 'true';
		if (!isThrottleEnabled) {
			return true;
		}
		return super.canActivate(context);
	}

	/**
	 * Override to extract real IP when behind proxy
	 */
	protected async getTracker(req: Request): Promise<string> {
		const trustProxy = process.env.THROTTLE_TRUST_PROXY === 'true';

		if (!trustProxy) {
			return super.getTracker(req);
		}

		const forwardedFor = req.headers['x-forwarded-for'];

		if (forwardedFor) {
			const proxyDepth = Number(process.env.THROTTLE_PROXY_DEPTH ?? 1);
			const ips = Array.isArray(forwardedFor)
				? forwardedFor[0].split(',')
				: forwardedFor.split(',');

			const clientIp = ips[Math.max(0, ips.length - proxyDepth)]?.trim();

			if (clientIp) {
				return clientIp;
			}
		}

		const realIp = req.headers['x-real-ip'];
		if (realIp) {
			return Array.isArray(realIp) ? realIp[0] : realIp;
		}

		return super.getTracker(req);
	}
}
