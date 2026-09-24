import { IsOptional, IsString } from 'class-validator';

export class CreateUploadDto {
	@IsOptional()
	@IsString()
	folder?: string;

	@IsOptional()
	@IsString()
	public_id?: string;
}
