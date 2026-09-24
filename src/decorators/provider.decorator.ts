import { SetMetadata } from '@nestjs/common';
import { Provider } from 'prisma/generated/client';

export const Providers = (...args: Provider[]) =>
	SetMetadata('providers', args);
