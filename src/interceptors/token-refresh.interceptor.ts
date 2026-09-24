import { AuthService } from '@/modules/auth/auth.service';
import {
	CallHandler,
	ExecutionContext,
	Injectable,
	NestInterceptor,
	UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class TokenRefreshInterceptor implements NestInterceptor {
	constructor(
		private readonly jwtService: JwtService,
		private readonly authService: AuthService
	) {}

	intercept(context: ExecutionContext, next: CallHandler) {
		const request = context.switchToHttp().getRequest<Request>();
		const response = context.switchToHttp().getResponse<Response>();
		// Skip token refresh for auth endpoints to avoid infinite loops
		const url = request.url;
		const authEndpoints = [
			'/auth/login',
			'/auth/register',
			'/auth/refresh-token',
			'/auth/google',
			'/auth/google/callback',
		];
		if (authEndpoints.some((endpoint) => url.includes(endpoint)))
			return next.handle();
		// Check if token needs refresh
		const accessToken = this.extractTokenFromRequest(request);
		if (accessToken && this.shouldRefreshToken(accessToken))
			return this.refreshTokenIfNeeded(request, response, next);
		return next.handle().pipe(
			catchError((error) => {
				// If we get a 401 error, try to refresh the token once
				if (error.status === 401 && this.canAttemptRefresh(request)) {
					return this.refreshTokenIfNeeded(request, response, next);
				}
				return throwError(() => error);
			})
		);
	}

	private extractTokenFromRequest(request: Request): string | null {
		// Try to get token from Authorization header first
		const authHeader = request.headers.authorization;
		if (authHeader && authHeader.startsWith('Bearer '))
			return authHeader.substring(7);
		// Fallback to cookie
		return request.cookies?.jwt ?? null;
	}

	private shouldRefreshToken(token: string): boolean {
		try {
			const decoded = this.jwtService.decode(token);
			if (!decoded || !decoded.exp) return false;
			const currentTime = Math.floor(Date.now() / 1000);
			const timeUntilExpiry = decoded.exp - currentTime;
			// Refresh if token expires in less than 5 minutes
			return timeUntilExpiry < 300;
		} catch {
			return false;
		}
	}

	private canAttemptRefresh(request: Request): boolean {
		// Check if we have a refresh token available
		return !!request.cookies?.refreshToken;
	}

	private async refreshTokenIfNeeded(
		request: Request,
		response: Response,
		next: CallHandler
	) {
		const refreshToken = request.cookies?.refreshToken;
		if (!refreshToken) throw new UnauthorizedException('NO_REFRESH_TOKEN');
		try {
			// Verify refresh token
			const payload = this.jwtService.verify(refreshToken, {
				secret: process.env.REFRESH_TOKEN_SECRET,
			});
			// Issue new tokens
			const { accessToken } = await this.authService.setAuthCookies(
				payload.id,
				response
			);
			// Update the request with new token for the current request
			if (request.headers.authorization)
				request.headers.authorization = `Bearer ${accessToken}`;
			// Set a custom header to inform the client that tokens were refreshed
			response.setHeader('X-Token-Refreshed', 'true');
			response.setHeader('X-New-Access-Token', accessToken);
			return next.handle();
		} catch {
			this.authService.invalidateAuthCookies(response);
			throw new UnauthorizedException('INVALID_REFRESH_TOKEN');
		}
	}
}
