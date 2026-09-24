import {
	IsEmail,
	IsNotEmpty,
	IsString,
	IsStrongPassword,
} from 'class-validator';

export class CreateRegisterDto {
	@IsString()
	@IsNotEmpty()
	username: string;

	@IsString()
	@IsNotEmpty()
	firstName: string;

	@IsString()
	@IsNotEmpty()
	lastName: string;

	@IsString()
	@IsEmail()
	@IsNotEmpty()
	email: string;

	@IsStrongPassword({
		minLength: 8,
		minLowercase: 1,
		minUppercase: 1,
		minNumbers: 1,
		minSymbols: 1,
	})
	@IsNotEmpty()
	password: string;

	constructor(
		username: string,
		firstName: string,
		lastName: string,
		email: string,
		password: string
	) {
		this.firstName = firstName;
		this.lastName = lastName;
		this.email = email;
		this.password = password;
	}
}
