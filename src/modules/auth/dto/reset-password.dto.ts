import { IsNotEmpty, IsString, IsStrongPassword } from 'class-validator';

export class ResetPasswordDto {
	@IsString()
	@IsNotEmpty()
	token: string;

	@IsString()
	@IsStrongPassword({
		minLength: 8,
		minLowercase: 1,
		minUppercase: 1,
		minNumbers: 1,
		minSymbols: 1,
	})
	@IsNotEmpty()
	password: string;

	constructor(token: string, password: string) {
		this.token = token;
		this.password = password;
	}
}
