import {
	BODYLESS_METHODS,
	ENCRYPTION_SKIP_CONTENT_TYPES,
	ENCRYPTION_SKIP_ROUTES,
} from '@/constants/encryption';
import { SKIP_ENCRYPTION_KEY } from '@/decorators/skip-encryption.decorator';
import {
	decryptWithCryptoJS,
	encryptWithCryptoJS,
	isEncryptedFormat,
} from '@/utils/crypto-js.util';
import {
	BadRequestException,
	CallHandler,
	ExecutionContext,
	Injectable,
	Logger,
	NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class EncryptionInterceptor implements NestInterceptor {
	private readonly logger = new Logger(EncryptionInterceptor.name);

	constructor(private readonly reflector: Reflector) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		// Check if encryption is enabled globally
		const encryptionEnabled = process.env.ENCRYPTION_ENABLED === 'true';
		if (!encryptionEnabled) {
			return next.handle();
		}

		// Only handle HTTP contexts (not RPC, WebSocket, etc.)
		if (context.getType() !== 'http') {
			return next.handle();
		}

		const request = context.switchToHttp().getRequest<Request>();
		const response = context.switchToHttp().getResponse<Response>();

		// Check if encryption should be skipped for this handler
		if (this.shouldSkipEncryption(context, request)) {
			return next.handle();
		}

		// Decrypt incoming request body
		this.decryptRequestBody(request);

		// Encrypt outgoing response
		return next
			.handle()
			.pipe(map((data) => this.encryptResponseData(data, response)));
	}

	/**
	 * Determines if encryption should be skipped based on:
	 * - Decorator metadata
	 * - Content type
	 * - Route path
	 * - HTTP method for request decryption
	 */
	private shouldSkipEncryption(
		context: ExecutionContext,
		request: Request
	): boolean {
		// Check @SkipEncryption() decorator
		const skipByDecorator = this.reflector.getAllAndOverride<boolean>(
			SKIP_ENCRYPTION_KEY,
			[context.getHandler(), context.getClass()]
		);
		if (skipByDecorator) {
			this.logger.debug(`Skipping encryption for ${request.url} - decorator`);
			return true;
		}

		// Check if route is in skip list
		const routePath = request.path || request.url;
		if (this.isSkippedRoute(routePath)) {
			this.logger.debug(`Skipping encryption for ${routePath} - route list`);
			return true;
		}

		// Check content type (for file uploads, etc.)
		const contentType = request.headers['content-type'] || '';
		if (this.isSkippedContentType(contentType)) {
			this.logger.debug(
				`Skipping encryption for ${routePath} - content type: ${contentType}`
			);
			return true;
		}

		return false;
	}

	/**
	 * Checks if route matches any skip patterns
	 */
	private isSkippedRoute(routePath: string): boolean {
		for (const skipRoute of ENCRYPTION_SKIP_ROUTES) {
			if (routePath.startsWith(skipRoute)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Checks if content type should skip encryption
	 */
	private isSkippedContentType(contentType: string): boolean {
		for (const skipType of ENCRYPTION_SKIP_CONTENT_TYPES) {
			if (contentType.includes(skipType)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Decrypts the request body if it exists and is encrypted
	 * Strict mode: Throws error if body exists but is not properly encrypted
	 */
	private decryptRequestBody(request: Request): void {
		const method = request.method.toUpperCase();

		// Skip decryption for methods that typically don't have bodies
		if (BODYLESS_METHODS.has(method)) {
			return;
		}

		// If no body, that's ok for methods like POST (optional body)
		if (!request.body || Object.keys(request.body).length === 0) {
			return;
		}

		// Strict mode: Request must have { data: 'encrypted_string' } format
		if (!request.body.data) {
			throw new BadRequestException(
				'ENCRYPTION_REQUIRED: Request body must contain encrypted data in { data: "..." } format'
			);
		}

		const encryptedData = request.body.data;

		// Validate it's a string
		if (typeof encryptedData !== 'string') {
			throw new BadRequestException(
				'INVALID_ENCRYPTED_FORMAT: Encrypted data must be a string'
			);
		}

		// Validate it looks like encrypted base64
		if (!isEncryptedFormat(encryptedData)) {
			throw new BadRequestException(
				'INVALID_ENCRYPTED_DATA: Data does not appear to be properly encrypted'
			);
		}

		try {
			const decryptionKey = process.env.DECRYPTION_PASSPHRASE;
			if (!decryptionKey) {
				this.logger.error('DECRYPTION_PASSPHRASE not configured');
				throw new BadRequestException('Server encryption configuration error');
			}

			const decryptedData = decryptWithCryptoJS(encryptedData, decryptionKey);

			// Replace request body with decrypted data
			request.body = decryptedData;

			this.logger.debug(
				`Successfully decrypted request body for ${request.method} ${request.url}`
			);
		} catch (error) {
			this.logger.error(`Decryption failed: ${error.message}`);
			throw new BadRequestException(
				'DECRYPTION_FAILED: Unable to decrypt request data - invalid key or corrupted data'
			);
		}
	}

	/**
	 * Encrypts the response data
	 * Wraps in { data: 'encrypted_base64_string' } format
	 */
	private encryptResponseData(data: any, response: Response): any {
		try {
			const encryptionKey = process.env.ENCRYPTION_PASSPHRASE;
			if (!encryptionKey) {
				this.logger.error('ENCRYPTION_PASSPHRASE not configured');
				// Return data unencrypted rather than crashing
				return data;
			}

			// Don't encrypt empty responses
			if (data === null || data === undefined) {
				return { data: null };
			}

			const encrypted = encryptWithCryptoJS(data, encryptionKey);

			// Set custom header to indicate encrypted response
			response.setHeader('X-Response-Encrypted', 'true');

			return { data: encrypted };
		} catch (error) {
			this.logger.error(`Response encryption failed: ${error.message}`);
			// Return data unencrypted rather than crashing
			// In production, you might want to throw an error instead
			return data;
		}
	}
}
