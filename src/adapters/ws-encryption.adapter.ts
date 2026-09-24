import { EncryptionService } from '@/modules/encryption/encryption.service';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Server, ServerOptions, Socket } from 'socket.io';

export class WsEncryptionAdapter extends IoAdapter {
	private readonly logger = new Logger(WsEncryptionAdapter.name);

	constructor(
		app: INestApplicationContext,
		private readonly encryptionService: EncryptionService
	) {
		super(app);
	}

	createIOServer(port: number, options?: ServerOptions): Server {
		const server = super.createIOServer(port, options);

		if (!this.encryptionService.isEnabled()) {
			this.logger.log('WebSocket encryption disabled');
			return server;
		}

		this.logger.log('WebSocket encryption enabled');
		server.use((socket: Socket, next) => {
			this.setupEncryptionMiddleware(socket);
			next();
		});

		return server;
	}

	private setupEncryptionMiddleware(socket: Socket): void {
		const originalOn = socket.on.bind(socket);
		socket.on = (event: string, listener: (...args: any[]) => void) => {
			const wrappedListener = (...args: any[]) => {
				try {
					if (this.isInternalEvent(event)) {
						return listener(...args);
					}

					const [encryptedData, ...rest] = args;
					if (
						encryptedData &&
						typeof encryptedData === 'object' &&
						'data' in encryptedData
					) {
						const decryptedData =
							this.encryptionService.decryptRequest(encryptedData);
						return listener(decryptedData, ...rest);
					}

					return listener(...args);
				} catch (error) {
					this.logger.error(
						`Failed to decrypt WebSocket event '${event}': ${error.message}`
					);
					socket.emit('error', { event, message: 'Failed to decrypt message' });
				}
			};

			return originalOn(event, wrappedListener);
		};

		const originalEmit = socket.emit.bind(socket);
		socket.emit = (event: string, ...args: any[]) => {
			try {
				if (this.isInternalEvent(event) || event === 'error') {
					return originalEmit(event, ...args);
				}

				const [data, ...rest] = args;
				const encryptedResponse = this.encryptionService.encryptResponse(data);
				return originalEmit(event, encryptedResponse, ...rest);
			} catch (error) {
				this.logger.error(
					`Failed to encrypt WebSocket event '${event}': ${error.message}`
				);
				return originalEmit(event, ...args);
			}
		};
	}

	private isInternalEvent(event: string): boolean {
		const internalEvents = [
			'connect',
			'connection',
			'disconnect',
			'disconnecting',
			'error',
			'connect_error',
			'connect_timeout',
			'reconnect',
			'reconnect_attempt',
			'reconnecting',
			'reconnect_error',
			'reconnect_failed',
			'ping',
			'pong',
		];

		return internalEvents.includes(event);
	}
}
