import { Module } from '@nestjs/common';
import { ConfigModule, type ConfigType } from '@nestjs/config';
import { PrismaClient } from 'prisma/generated/client';
import { CategoryController } from './category/category.controller';
import { CategoryService } from './category/category.service';
import { yacConfig } from './config/yac.config';
import { ProductController } from './product/product.controller';
import { ProductService } from './product/product.service';
import { YacLotRepository } from './sync/yac-lot.repository';
import { YauctionsSchedulerService } from './sync/yauctions-scheduler.service';
import { YauctionsSyncService } from './sync/yauctions-sync.service';

@Module({
	imports: [ConfigModule.forFeature(yacConfig)],
	controllers: [CategoryController, ProductController],
	providers: [
		CategoryService,
		ProductService,
		YauctionsSchedulerService,
		{
			provide: YauctionsSyncService,
			inject: [yacConfig.KEY, PrismaClient],
			useFactory: (
				config: ConfigType<typeof yacConfig>,
				prisma: PrismaClient
			) => new YauctionsSyncService(config, new YacLotRepository(prisma)),
		},
	],
	exports: [YauctionsSyncService],
})
export class YauctionsModule {}
