import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { Provider } from 'prisma/generated/client';

export class CreateOauthDto {
	@IsString()
	@IsOptional()
	firstName?: string;

	@IsString()
	@IsOptional()
	lastName?: string;

	@IsString()
	@IsOptional()
	username?: string;

	@IsEmail()
	@IsOptional()
	email?: string;

	@IsString()
	@IsOptional()
	picture?: string;

	@IsEnum(Provider)
	@IsOptional()
	provider?: Provider;

	constructor(
		firstName?: string,
		lastName?: string,
		email?: string,
		username?: string,
		picture?: string,
		provider?: Provider
	) {
		this.firstName = firstName;
		this.lastName = lastName;
		this.email = email;
		this.username = username;
		this.picture = picture;
		this.provider = provider;
	}
}
