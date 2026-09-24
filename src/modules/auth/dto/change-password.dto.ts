import { IsNotEmpty, IsStrongPassword } from 'class-validator';

export class ChangePasswordDto {
	@IsStrongPassword({
		minLength: 8,
		minLowercase: 1,
		minUppercase: 1,
		minNumbers: 1,
		minSymbols: 1,
	})
	@IsNotEmpty()
	currentPassword: string;

	@IsStrongPassword({
		minLength: 8,
		minLowercase: 1,
		minUppercase: 1,
		minNumbers: 1,
		minSymbols: 1,
	})
	@IsNotEmpty()
	password: string;

	@IsStrongPassword({
		minLength: 8,
		minLowercase: 1,
		minUppercase: 1,
		minNumbers: 1,
		minSymbols: 1,
	})
	@IsNotEmpty()
	confirmPassword: string;

	constructor(
		currentPassword: string,
		password: string,
		confirmPassword: string
	) {
		this.currentPassword = currentPassword;
		this.password = password;
		this.confirmPassword = confirmPassword;
	}
}
