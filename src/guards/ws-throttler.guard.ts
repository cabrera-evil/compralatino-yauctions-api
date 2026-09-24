/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerRequest } from '@nestjs/throttler';
import { WsException } from '@nestjs/websockets';

/**
 * WebSocket Throttler Guard
 *
 * Applies rate limiting to WebSocket connections
 * Uses socket.handshake for IP extraction
 */
@Injectable()
export class WsThrottlerGuard extends ThrottlerGuard {
	/**
	 * Override to handle WebSocket context
	 */
	async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
		const { context, limit, ttl, throttler, blockDuration, generateKey } =
			requestProps;

		const client = context.switchToWs().getClient();
		const tracker = this.getClientIp(client);
		const key = generateKey(context, tracker, `ws-${throttler.name}`);
		const { totalHits, isBlocked } = await this.storageService.increment(
			key,
			ttl,
			limit,
			blockDuration,
			throttler.name
		);

		if (isBlocked || totalHits > limit) {
			throw new WsException('Too many requests');
		}

		return true;
	}

	/**
	 * Extract IP from WebSocket client
	 */
	protected getClientIp(client: any): string {
		const trustProxy = process.env.THROTTLE_TRUST_PROXY === 'true';

		if (!trustProxy) {
			return (
				client.handshake?.address || client.conn?.remoteAddress || 'unknown'
			);
		}

		const forwardedFor = client.handshake?.headers['x-forwarded-for'];

		if (forwardedFor) {
			const proxyDepth = Number(process.env.THROTTLE_PROXY_DEPTH ?? 1);
			const ips = forwardedFor.split(',');
			const clientIp = ips[Math.max(0, ips.length - proxyDepth)]?.trim();

			if (clientIp) return clientIp;
		}

		const realIp = client.handshake?.headers['x-real-ip'];
		if (realIp) return realIp;

		return client.handshake?.address || client.conn?.remoteAddress || 'unknown';
	}
}
