import { JwtConfig } from '@/config/jwt.config';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SocketGateway } from './socket.gateway';

@Module({
	imports: [JwtModule.registerAsync(JwtConfig)],
	providers: [SocketGateway],
	exports: [SocketGateway],
})
export class SocketModule {}
