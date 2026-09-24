import { UserService } from '@/modules/user/user.service';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Provider } from 'prisma/generated/client';

@Injectable()
export class ProviderGuard implements CanActivate {
	constructor(
		private reflector: Reflector,
		private userService: UserService
	) {}

	matchRoles(providers: Provider[], userProvider: Provider) {
		return providers.some((provider) => provider === userProvider);
	}

	async canActivate(context: ExecutionContext) {
		const providers = this.reflector.get<Provider[]>(
			'providers',
			context.getHandler()
		);
		const req = context.switchToHttp().getRequest();
		if (req?.user) {
			const { data } = await this.userService.findOne(req.user.id);
			if (!data) return false;
			return this.matchRoles(providers, data.provider);
		}
		return false;
	}
}
