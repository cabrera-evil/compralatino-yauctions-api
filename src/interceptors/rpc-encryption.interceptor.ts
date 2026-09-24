import { EncryptionService } from '@/modules/encryption/encryption.service';
import {
	CallHandler,
	ExecutionContext,
	Injectable,
	Logger,
	NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class RpcEncryptionInterceptor implements NestInterceptor {
	private readonly logger = new Logger(RpcEncryptionInterceptor.name);

	constructor(private readonly encryptionService: EncryptionService) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		if (context.getType() !== 'rpc') {
			return next.handle();
		}

		if (!this.encryptionService.isEnabled()) {
			return next.handle();
		}

		if (this.encryptionService.shouldSkipEncryption(context)) {
			return next.handle();
		}

		const rpcContext = context.switchToRpc();
		const data = rpcContext.getData();

		if (data && typeof data === 'object' && 'data' in data) {
			try {
				const decryptedData = this.encryptionService.decryptRequest(data);
				rpcContext.getData = () => decryptedData;
			} catch (error) {
				this.logger.error(
					`RPC request decryption failed for ${context.getHandler().name}: ${error.message}`
				);
				throw error;
			}
		}

		return next.handle().pipe(
			map((responseData) => {
				try {
					return this.encryptionService.encryptResponse(responseData);
				} catch (error) {
					this.logger.error(
						`RPC response encryption failed for ${context.getHandler().name}: ${error.message}`
					);
					return responseData;
				}
			})
		);
	}
}
