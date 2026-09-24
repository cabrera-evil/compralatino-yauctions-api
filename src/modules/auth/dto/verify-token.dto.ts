import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyTokenDto {
	@IsString()
	@IsNotEmpty()
	token: string;

	constructor(token: string) {
		this.token = token;
	}
}
