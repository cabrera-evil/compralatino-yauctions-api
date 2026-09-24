import { ApiKeyService } from '@/modules/api-key/api-key.service';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class RpcAuthGuard implements CanActivate {
	constructor(private readonly apiKeyService: ApiKeyService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const payload = context.switchToRpc().getData();

		const apiKey = payload?.auth?.apiKey ?? payload?.apiKey;
		if (!apiKey) {
			throw new RpcException('Missing API key');
		}

		const user = await this.apiKeyService.validateKey(apiKey);
		if (!user) {
			const validKeys = (process.env.API_KEYS ?? '')
				.split(',')
				.map((key) => key.trim())
				.filter(Boolean);
			if (!validKeys.includes(apiKey)) {
				throw new RpcException('Invalid API key');
			}
		} else {
			this.apiKeyService.updateLastUsed(apiKey).catch(() => {
				// Silently fail to avoid blocking requests
			});
		}

		return true;
	}
}
