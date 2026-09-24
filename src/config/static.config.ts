import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';

@Module({
	imports: [
		ServeStaticModule.forRoot({
			rootPath: process.cwd() + '/public/',
		}),
	],
})
export class StaticConfig {}
