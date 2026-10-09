import {
	YAUCTIONS_CATEGORIES_LIST_PATTERN,
	YAUCTIONS_PRODUCTS_GET_PATTERN,
	YAUCTIONS_PRODUCTS_LIST_PATTERN,
	YAUCTIONS_PRODUCTS_VALIDATE_PATTERN,
} from '@/constants/rabbitmq';
import { SkipEncryption } from '@/decorators/skip-encryption.decorator';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { YauctionsRpcService } from './yauctions-rpc.service';

@Controller()
@SkipEncryption()
export class YauctionsRpcController {
	constructor(private readonly rpcService: YauctionsRpcService) {}

	@MessagePattern(YAUCTIONS_PRODUCTS_LIST_PATTERN)
	listProducts(@Payload() payload: unknown) {
		return this.rpcService.listProducts(payload);
	}

	@MessagePattern(YAUCTIONS_PRODUCTS_GET_PATTERN)
	getProduct(@Payload() payload: unknown) {
		return this.rpcService.getProduct(payload);
	}

	@MessagePattern(YAUCTIONS_PRODUCTS_VALIDATE_PATTERN)
	validateProducts(@Payload() payload: unknown) {
		return this.rpcService.validateProducts(payload);
	}

	@MessagePattern(YAUCTIONS_CATEGORIES_LIST_PATTERN)
	listCategories() {
		return this.rpcService.listCategories();
	}
}
