import { EnvironmentSchema } from '@/schemas/environment.schema';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			validationSchema: EnvironmentSchema,
		}),
	],
})
export class EnvironmentConfig {}
