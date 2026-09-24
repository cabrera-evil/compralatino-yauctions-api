import { IsNotEmpty, IsString } from 'class-validator';

export class CreateLoginDto {
	@IsString()
	@IsNotEmpty()
	identifier: string;

	@IsString()
	@IsNotEmpty()
	password: string;

	constructor(identifier: string, password: string) {
		this.identifier = identifier;
		this.password = password;
	}
}
