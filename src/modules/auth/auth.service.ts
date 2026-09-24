import { hashPassword } from '@/utils/bcrypt.util';
import { singleResponse } from '@/utils/response.util';
import { MailerService } from '@nestjs-modules/mailer';
import {
	Injectable,
	NotFoundException,
	UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcryptjs from 'bcryptjs';
import { Response } from 'express';
import { Prisma, PrismaClient, Provider } from 'prisma/generated/client';
import { stripeSensitive } from '../../utils/stripe-sensitive.util';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateOauthDto } from './dto/create-outh.dto';
import { CreateRegisterDto } from './dto/create-register.dto';
import { RequestTokenDto } from './dto/request-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyTokenDto } from './dto/verify-token.dto';

@Injectable()
export class AuthService {
	constructor(
		private readonly prisma: PrismaClient,
		private readonly jwtService: JwtService,
		private readonly mailerService: MailerService
	) {}

	async validateUser(identifier: string, password: string) {
		const user = await this.prisma.user.findFirst({
			where: {
				OR: [{ email: identifier }, { username: identifier }],
			},
		});
		if (!user) return null;
		const isValid = await bcryptjs.compare(password, user.password);
		return isValid ? user : null;
	}

	signToken(id: number) {
		const accessToken = this.jwtService.sign(
			{ id },
			{
				secret: process.env.JWT_SECRET,
				expiresIn: '15m',
			}
		);
		const refreshToken = this.jwtService.sign(
			{ id },
			{
				secret: process.env.REFRESH_TOKEN_SECRET,
				expiresIn: '7d',
			}
		);
		return { accessToken, refreshToken };
	}

	async setAuthCookies(id: number, res: Response) {
		const { accessToken, refreshToken } = this.signToken(id);
		// Set secure cookies
		res.cookie('jwt', accessToken, {
			httpOnly: true,
			sameSite: 'strict',
			secure: process.env.NODE_ENV === 'production',
			maxAge: 15 * 60 * 1000, // 15 minutes
		});
		res.cookie('refreshToken', refreshToken, {
			httpOnly: true,
			sameSite: 'strict',
			secure: process.env.NODE_ENV === 'production',
			maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
		});
		// Update user's last login
		await this.prisma.user.update({
			where: { id },
			data: { lastLoginAt: new Date() },
		});
		return {
			accessToken,
			refreshToken,
		};
	}

	invalidateAuthCookies(res: Response) {
		res.clearCookie('jwt', {
			httpOnly: true,
			sameSite: 'strict',
			secure: process.env.NODE_ENV === 'production',
		});
		res.clearCookie('refreshToken', {
			httpOnly: true,
			sameSite: 'strict',
			secure: process.env.NODE_ENV === 'production',
		});
	}

	async login(id: number, res: Response) {
		const user = await this.prisma.user.findUnique({
			where: { id },
		});
		if (!user) throw new NotFoundException('USER_NOT_FOUND');
		const { accessToken, refreshToken } = await this.setAuthCookies(
			user.id,
			res
		);
		return singleResponse({
			user: stripeSensitive(user),
			jwt: accessToken,
			refreshToken,
		});
	}

	async refreshToken(refreshToken: string, res: Response) {
		try {
			const payload = this.jwtService.verify(refreshToken, {
				secret: process.env.REFRESH_TOKEN_SECRET,
			});
			const user = await this.prisma.user.findUnique({
				where: { id: payload.id },
			});
			if (!user) throw new UnauthorizedException('INVALID_REFRESH_TOKEN');
			const { accessToken, refreshToken: newRefreshToken } =
				await this.setAuthCookies(user.id, res);
			return singleResponse({
				user: stripeSensitive(user),
				jwt: accessToken,
				refreshToken: newRefreshToken,
			});
		} catch {
			throw new UnauthorizedException('INVALID_REFRESH_TOKEN');
		}
	}

	async logout(userId: number, res: Response) {
		const user = await this.prisma.user.findUnique({
			where: { id: userId },
		});
		if (!user) throw new NotFoundException('USER_NOT_FOUND');
		this.invalidateAuthCookies(res);
		return singleResponse({
			message: 'Logged out successfully',
		});
	}

	async register(createRegisterDto: CreateRegisterDto, res: Response) {
		createRegisterDto.password = await hashPassword(createRegisterDto.password);
		const user = await this.prisma.user.create({
			data: createRegisterDto,
		});
		const { accessToken, refreshToken } = await this.setAuthCookies(
			user.id,
			res
		);
		return singleResponse({
			user: stripeSensitive(user),
			jwt: accessToken,
			refreshToken,
		});
	}

	async profile(id: number, query?: Omit<Prisma.UserFindUniqueArgs, 'where'>) {
		const user = await this.prisma.user.findUnique({
			where: { id: id },
			...query,
		});
		if (!user) throw new NotFoundException('USER_NOT_FOUND');
		return singleResponse(stripeSensitive(user));
	}

	async requestResetToken(requestTokenDto: RequestTokenDto) {
		const user = await this.prisma.user.findUnique({
			where: { email: requestTokenDto.email },
		});
		if (!user) throw new NotFoundException('USER_NOT_FOUND');
		if (user.provider !== Provider.LOCAL)
			throw new UnauthorizedException('PROVIDER_NOT_LOCAL');
		const token = crypto.getRandomValues(new Uint32Array(1))[0].toString(16);
		const expiresAt = new Date();
		expiresAt.setMinutes(expiresAt.getMinutes() + 15);
		await this.prisma.resetPassword.upsert({
			where: { userId: user.id },
			update: {
				token,
				expiresAt,
			},
			create: {
				userId: user.id,
				token,
				expiresAt,
			},
		});
		this.mailerService.sendMail({
			to: requestTokenDto.email,
			subject: 'Recuperación de contraseña',
			template: 'reset-password',
			context: {
				name: `${user.firstName} ${user.lastName}`,
				resetLink: `${process.env.FRONTEND_URL}/auth/forgot-password/${token}`,
				companyName: 'CabreraDev',
			},
		});
		return singleResponse({
			message: 'If a user with that email exists, a reset token has been sent.',
		});
	}

	async verifyResetToken(verifyTokenDto: VerifyTokenDto) {
		const resetPasswordRecord = await this.prisma.resetPassword.findUnique({
			where: { token: verifyTokenDto.token },
			include: { user: true },
		});
		if (!resetPasswordRecord) throw new NotFoundException('USER_NOT_FOUND');
		if (new Date() > resetPasswordRecord.expiresAt)
			throw new UnauthorizedException('RESET_PASSWORD_TOKEN_EXPIRED');
		return singleResponse({ message: 'Reset token is valid.' });
	}

	async resetPassword(resetPasswordDto: ResetPasswordDto) {
		const resetPasswordRecord = await this.prisma.resetPassword.findUnique({
			where: { token: resetPasswordDto.token },
			include: { user: true },
		});
		if (!resetPasswordRecord) throw new NotFoundException('USER_NOT_FOUND');
		if (new Date() > resetPasswordRecord.expiresAt)
			throw new UnauthorizedException('RESET_PASSWORD_TOKEN_EXPIRED');
		const hash = await hashPassword(resetPasswordDto.password);
		await this.prisma.user.update({
			where: { id: resetPasswordRecord.userId },
			data: { password: hash },
		});
		await this.prisma.resetPassword.delete({
			where: { id: resetPasswordRecord.id },
		});
		return singleResponse({ message: 'Password reset successfully.' });
	}

	async oauthCallback(createOatuhDto: CreateOauthDto, res: Response) {
		let user = await this.prisma.user.findFirst({
			where: {
				OR: [
					{ email: createOatuhDto.email },
					{ username: createOatuhDto.username },
				],
			},
		});
		if (!user)
			user = await this.prisma.user.create({
				data: {
					email: createOatuhDto.email ?? null,
					username:
						createOatuhDto.username ?? createOatuhDto.email.split('@')[0],
					firstName: createOatuhDto.firstName ?? null,
					lastName: createOatuhDto.lastName ?? null,
					picture: null,
					provider: createOatuhDto.provider,
					password: '',
				},
			});
		const { accessToken, refreshToken } = await this.setAuthCookies(
			user.id,
			res
		);
		return singleResponse({
			user: stripeSensitive(user),
			jwt: accessToken,
			refreshToken,
		});
	}

	async changePassword(id: number, changePasswordDto: ChangePasswordDto) {
		const user = await this.prisma.user.findUnique({
			where: { id },
		});
		if (!user) throw new NotFoundException('USER_NOT_FOUND');
		if (user.provider !== Provider.LOCAL)
			throw new UnauthorizedException('PROVIDER_NOT_LOCAL');
		const isValid = await bcryptjs.compare(
			changePasswordDto.currentPassword,
			user.password
		);
		if (!isValid) throw new UnauthorizedException('INVALID_CURRENT_PASSWORD');
		if (changePasswordDto.password !== changePasswordDto.confirmPassword)
			throw new UnauthorizedException('PASSWORDS_DO_NOT_MATCH');
		const hash = await hashPassword(changePasswordDto.password);
		await this.prisma.user.update({
			where: { id: id },
			data: { password: hash },
		});
		return singleResponse({ message: 'Password changed successfully.' });
	}
}
