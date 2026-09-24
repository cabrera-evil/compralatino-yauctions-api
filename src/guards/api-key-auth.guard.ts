import { API_KEY_AUTH_ENABLED } from '@/decorators/api-key-auth.decorator';
import { ApiKeyService } from '@/modules/api-key/api-key.service';
import {
	CanActivate,
	ExecutionContext,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
	constructor(
		private readonly apiKeyService: ApiKeyService,
		private readonly reflector: Reflector
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		// Check if @ApiKeyAuth() decorator is present
		const apiKeyEnabled = this.reflector.getAllAndOverride<boolean>(
			API_KEY_AUTH_ENABLED,
			[context.getHandler(), context.getClass()]
		);

		if (!apiKeyEnabled) {
			return true;
		}

		const request = context.switchToHttp().getRequest();
		const apiKey = this.extractApiKey(request);

		if (!apiKey) {
			throw new UnauthorizedException('Missing API key');
		}

		const user = await this.apiKeyService.validateKey(apiKey);

		if (!user) {
			throw new UnauthorizedException('Invalid API key');
		}

		// CRITICAL: Populate request.user for audit logging and downstream guards
		request.user = user;
		request.authMethod = 'api-key';

		// Update last used timestamp (async, non-blocking)
		this.apiKeyService.updateLastUsed(apiKey).catch(() => {
			// Silently fail to avoid blocking requests
		});

		return true;
	}

	/**
	 * Extract API key from X-API-Key header
	 * @param request - HTTP request object
	 * @returns API key string or null
	 */
	private extractApiKey(request: any): string | null {
		const header = request.headers['x-api-key'];
		if (Array.isArray(header)) return header[0] ?? null;
		return typeof header === 'string' ? header : null;
	}
}
