import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaClient } from 'prisma/generated/client';
import { JWTPayload } from '../types/jwt-payload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(private readonly prisma: PrismaClient) {
		super({
			jwtFromRequest: ExtractJwt.fromExtractors([
				JwtStrategy.extractJWTFromCookie,
				ExtractJwt.fromAuthHeaderAsBearerToken(),
			]),
			ignoreExpiration: false,
			secretOrKey: process.env.JWT_SECRET,
			passReqToCallback: true,
		});
	}

	private static extractJWTFromCookie(req: Request) {
		return req.cookies ? (req.cookies.jwt ?? req.cookies.refreshToken) : null;
	}

	async validate(_req: Request, payload: JWTPayload & { type?: string }) {
		const user = await this.prisma.user.findUnique({
			where: { id: Number(payload.id) },
		});
		if (!user) throw new UnauthorizedException('USER_NOT_FOUND');
		return user;
	}
}
