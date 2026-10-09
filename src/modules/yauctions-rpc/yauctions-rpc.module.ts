import { Module } from '@nestjs/common';
import { YauctionsModule } from '../yauctions/yauctions.module';
import { YauctionsRpcController } from './yauctions-rpc.controller';
import { YauctionsRpcService } from './yauctions-rpc.service';

@Module({
	imports: [YauctionsModule],
	controllers: [YauctionsRpcController],
	providers: [YauctionsRpcService],
})
export class YauctionsRpcModule {}
