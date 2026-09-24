/* eslint-disable @typescript-eslint/no-explicit-any */
import { WsThrottlerGuard } from '@/guards/ws-throttler.guard';
import { Logger, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
	OnGatewayConnection,
	OnGatewayDisconnect,
	OnGatewayInit,
	WebSocketGateway,
	WebSocketServer,
	WsResponse,
} from '@nestjs/websockets';
import { Observable } from 'rxjs';
import { Server, Socket } from 'socket.io';

type EventHandler<T = any> = (
	data: T,
	socket: Socket
) => Observable<WsResponse> | Promise<WsResponse>;

@WebSocketGateway({
	cors: {
		origin: '*',
	},
})
@UseGuards(WsThrottlerGuard)
export class SocketGateway
	implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
	private readonly logger = new Logger(SocketGateway.name);
	private readonly connectedSockets = new Map<string, number>();
	private readonly eventHandlers: Record<string, EventHandler<any>> = {};

	constructor(private readonly jwtService: JwtService) {}

	@WebSocketServer()
	server?: Server;

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	afterInit(_server: Server) {
		this.logger.log('WebSocket Gateway initialized');
	}

	registerEventHandler<T = any>(eventName: string, handler: EventHandler<T>) {
		this.eventHandlers[eventName] = handler;
	}

	handleConnection(socket: Socket) {
		const userId = this.authenticateSocket(socket);
		this.connectedSockets.set(socket.id, userId);
		this.logger.log(`Socket connected: ${socket.id}`);

		this.bindSocketEvents(socket);
	}

	handleDisconnect(socket: Socket) {
		this.connectedSockets.delete(socket.id);
		this.logger.log(`Socket disconnected: ${socket.id}`);
	}

	emitToAll(event: string, data: any) {
		this.server?.emit(event, data);
	}

	emitToUser(userId: number, event: string, data: any) {
		for (const [socketId, connectedUserId] of this.connectedSockets) {
			if (connectedUserId === userId) {
				this.server?.to(socketId).emit(event, data);
			}
		}
	}

	emitToUserBulk(userIds: number[], event: string, data: any) {
		const targetIds = new Set(userIds);
		for (const [socketId, connectedUserId] of this.connectedSockets) {
			if (targetIds.has(connectedUserId)) {
				this.server?.to(socketId).emit(event, data);
			}
		}
	}

	broadcastExceptSender(socket: Socket, event: string, data: any) {
		socket.broadcast.emit(event, data);
	}

	disconnectUser(userId: number) {
		for (const [socketId, connectedUserId] of this.connectedSockets) {
			if (connectedUserId === userId) {
				this.server?.sockets.sockets.get(socketId)?.disconnect(true);
				this.connectedSockets.delete(socketId);
			}
		}
	}

	getConnectedUserId(socketId: string): number | undefined {
		return this.connectedSockets.get(socketId);
	}

	getSocketsByUserId(userId: number) {
		const sockets: Socket[] = [];
		for (const [socketId, connectedUserId] of this.connectedSockets) {
			if (connectedUserId === userId) {
				const socket = this.server?.sockets.sockets.get(socketId);
				if (socket) sockets.push(socket);
			}
		}
		return sockets;
	}

	getConnectedUsers(): Map<string, number> {
		return new Map(this.connectedSockets);
	}

	/**
	 * Room support
	 */

	async joinRoom(socket: Socket, room: string) {
		await socket.join(room);
		this.logger.log(`Socket ${socket.id} joined room ${room}`);
	}

	async leaveRoom(socket: Socket, room: string) {
		await socket.leave(room);
		this.logger.log(`Socket ${socket.id} left room ${room}`);
	}

	emitToRoom(room: string, event: string, data: any) {
		this.server?.to(room).emit(event, data);
	}

	broadcastToRoomExceptSender(
		socket: Socket,
		room: string,
		event: string,
		data: any
	) {
		socket.to(room).emit(event, data);
	}

	async getSocketsInRoom(room: string) {
		if (!this.server) return [];
		const sockets = await this.server.in(room).fetchSockets();
		return sockets.map((s) => s.id);
	}

	getSocketRooms(socket: Socket) {
		return Array.from(socket.rooms).filter((r) => r !== socket.id);
	}

	private bindSocketEvents(socket: Socket) {
		for (const [eventName, handler] of Object.entries(this.eventHandlers)) {
			socket.on(eventName, async (data) => {
				const result = await handler(data, socket);
				if (result) socket.emit(`${eventName}/response`, result);
			});
		}
	}

	private authenticateSocket(socket: Socket) {
		const { token } = socket.handshake.auth;
		if (!token) throw new UnauthorizedException('Missing auth token');
		const payload = this.jwtService.verify(token);
		if (!payload?.id) throw new UnauthorizedException('Invalid payload');
		return payload.id;
	}
}
