import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRoleDto {
	@IsString()
	@MaxLength(100)
	name: string;

	@IsString()
	@IsOptional()
	description?: string;

	@IsBoolean()
	@IsOptional()
	isSystem?: boolean;
}
