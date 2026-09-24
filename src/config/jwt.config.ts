import { JwtModuleAsyncOptions } from '@nestjs/jwt';

export const JwtConfig: JwtModuleAsyncOptions = {
	useFactory: () => {
		return {
			global: true,
			secret: process.env.JWT_SECRET,
		};
	},
};
