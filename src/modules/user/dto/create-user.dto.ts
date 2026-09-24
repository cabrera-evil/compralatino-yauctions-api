import { Transform } from 'class-transformer';
import {
	IsBoolean,
	IsDateString,
	IsEmail,
	IsEnum,
	IsNotEmpty,
	IsOptional,
	IsString,
	IsStrongPassword,
	IsUrl,
} from 'class-validator';
import { Provider } from 'prisma/generated/client';

export class CreateUserDto {
	@IsString()
	@IsNotEmpty()
	username: string;

	@IsString()
	@IsNotEmpty()
	firstName: string;

	@IsString()
	@IsNotEmpty()
	lastName: string;

	@IsEmail()
	@IsNotEmpty()
	email: string;

	@IsUrl()
	@IsOptional()
	picture?: string;

	@IsStrongPassword({
		minLength: 8,
		minLowercase: 1,
		minUppercase: 1,
		minNumbers: 1,
		minSymbols: 1,
	})
	@IsNotEmpty()
	password: string;

	@IsEnum(Provider)
	@IsOptional()
	provider?: Provider;

	@IsBoolean()
	@Transform(({ value }) =>
		value === '' || value === undefined ? undefined : Boolean(value)
	)
	@IsOptional()
	emailVerified?: boolean;

	@IsDateString()
	@IsOptional()
	emailVerifiedAt?: string;

	@IsBoolean()
	@Transform(({ value }) =>
		value === '' || value === undefined ? undefined : Boolean(value)
	)
	@IsOptional()
	profileCompleted?: boolean;

	@IsDateString()
	@IsOptional()
	lastLoginAt?: string;

	@IsDateString()
	@IsOptional()
	createdAt?: string;

	@IsDateString()
	@IsOptional()
	updatedAt?: string;

	@IsDateString()
	@IsOptional()
	deletedAt?: string;
}
