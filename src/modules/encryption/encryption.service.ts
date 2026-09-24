import { SKIP_ENCRYPTION_KEY } from '@/decorators/skip-encryption.decorator';
import {
	decryptWithCryptoJS,
	encryptWithCryptoJS,
	isEncryptedFormat,
} from '@/utils/crypto-js.util';
import {
	BadRequestException,
	ExecutionContext,
	Injectable,
	Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class EncryptionService {
	private readonly logger = new Logger(EncryptionService.name);

	constructor(private readonly reflector: Reflector) {}

	isEnabled(): boolean {
		return process.env.ENCRYPTION_ENABLED === 'true';
	}

	shouldSkipEncryption(context: ExecutionContext): boolean {
		return this.reflector.getAllAndOverride<boolean>(SKIP_ENCRYPTION_KEY, [
			context.getHandler(),
			context.getClass(),
		]);
	}

	isEncrypted(data: unknown): boolean {
		return typeof data === 'string' && isEncryptedFormat(data);
	}

	encrypt(data: any): string {
		const passphrase = process.env.ENCRYPTION_PASSPHRASE;
		if (!passphrase) {
			this.logger.error('ENCRYPTION_PASSPHRASE not configured');
			throw new Error('Server encryption configuration error');
		}
		return encryptWithCryptoJS(data, passphrase);
	}

	decrypt(encryptedData: string): any {
		if (typeof encryptedData !== 'string') {
			throw new BadRequestException(
				'INVALID_ENCRYPTED_FORMAT: Encrypted data must be a string'
			);
		}

		if (!this.isEncrypted(encryptedData)) {
			throw new BadRequestException(
				'INVALID_ENCRYPTED_DATA: Data does not appear to be properly encrypted'
			);
		}

		const passphrase = process.env.DECRYPTION_PASSPHRASE;
		if (!passphrase) {
			this.logger.error('DECRYPTION_PASSPHRASE not configured');
			throw new BadRequestException('Server encryption configuration error');
		}

		try {
			return decryptWithCryptoJS(encryptedData, passphrase);
		} catch (error) {
			this.logger.error(`Decryption failed: ${error.message}`);
			throw new BadRequestException(
				'DECRYPTION_FAILED: Unable to decrypt data - invalid key or corrupted data'
			);
		}
	}

	encryptResponse(data: any): { data: string | null } {
		try {
			if (data === null || data === undefined) {
				return { data: null };
			}
			return { data: this.encrypt(data) };
		} catch (error) {
			this.logger.error(`Response encryption failed: ${error.message}`);
			return data;
		}
	}

	decryptRequest(payload: { data?: string }): any {
		if (!payload || typeof payload !== 'object' || !payload.data) {
			throw new BadRequestException(
				'ENCRYPTION_REQUIRED: Request must contain encrypted data in { data: "..." } format'
			);
		}
		return this.decrypt(payload.data);
	}
}
