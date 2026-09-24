import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class RequestTokenDto {
	@IsString()
	@IsEmail()
	@IsNotEmpty()
	email: string;

	constructor(email: string) {
		this.email = email;
	}
}
