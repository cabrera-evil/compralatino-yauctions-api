import { Audit } from '@/decorators/audit.decorator';
import { Cookies } from '@/decorators/cookies.decorator';
import { Providers } from '@/decorators/provider.decorator';
import { RisonQuery } from '@/decorators/rison-query.decorator';
import { ProviderGuard } from '@/guards/provider.guard';
import {
	Body,
	Controller,
	Get,
	Patch,
	Post,
	Req,
	Request,
	Res,
	UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOAuth2, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Prisma, Provider, User } from 'prisma/generated/client';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateLoginDto } from './dto/create-login.dto';
import { CreateRegisterDto } from './dto/create-register.dto';
import { RequestTokenDto } from './dto/request-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyTokenDto } from './dto/verify-token.dto';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';

@Audit(false)
@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
	constructor(private authService: AuthService) {}

	@UseGuards(LocalAuthGuard)
	@ApiBody({ type: CreateLoginDto })
	@Post('login')
	login(
		@Request() req: Request & { user: User },
		@Res({ passthrough: true }) res: Response
	) {
		return this.authService.login(req.user.id, res);
	}

	@Post('refresh-token')
	refreshToken(
		@Cookies('refreshToken') refreshToken: string,
		@Res({ passthrough: true }) res: Response
	) {
		return this.authService.refreshToken(refreshToken, res);
	}

	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@Post('logout')
	logout(
		@Request() req: Request & { user: User },
		@Res({ passthrough: true }) res: Response
	) {
		return this.authService.logout(req.user.id, res);
	}

	@Post('register')
	register(
		@Body() payload: CreateRegisterDto,
		@Res({ passthrough: true }) res: Response
	) {
		return this.authService.register(payload, res);
	}

	@ApiBearerAuth()
	@UseGuards(JwtAuthGuard)
	@Post('profile')
	profile(
		@Request() req,
		@RisonQuery() query?: Omit<Prisma.UserFindUniqueArgs, 'where'>
	) {
		return this.authService.profile(req.user.id, query);
	}

	@Post('forgot-password/request-token')
	requestToken(@Body() payload: RequestTokenDto) {
		return this.authService.requestResetToken(payload);
	}

	@Post('forgot-password/verify-token')
	verifyToken(@Body() payload: VerifyTokenDto) {
		return this.authService.verifyResetToken(payload);
	}

	@Post('forgot-password/reset-password')
	resetPassword(@Body() payload: ResetPasswordDto) {
		return this.authService.resetPassword(payload);
	}

	@UseGuards(GoogleAuthGuard)
	@ApiOAuth2([])
	@Get('google')
	googleAuth() {}

	@UseGuards(GoogleAuthGuard)
	@ApiOAuth2([])
	@Get('google/callback')
	googleCallback(@Req() req, @Res({ passthrough: true }) res: Response) {
		return this.authService.oauthCallback(req.user, res);
	}

	@Providers(Provider.LOCAL)
	@UseGuards(ProviderGuard)
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@Patch('change-password')
	changePassword(@Request() req, @Body() payload: ChangePasswordDto) {
		return this.authService.changePassword(req.user, payload);
	}
}
