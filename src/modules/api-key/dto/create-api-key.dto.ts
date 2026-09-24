import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateApiKeyDto {
	@ApiProperty({
		description: 'Descriptive name for the API key',
		example: 'Production Server Key',
		minLength: 1,
		maxLength: 100,
	})
	@IsNotEmpty()
	@IsString()
	name: string;

	@ApiPropertyOptional({
		description: 'Optional expiration date for the API key',
		example: '2025-12-31T23:59:59Z',
		type: Date,
	})
	@IsOptional()
	@Type(() => Date)
	@IsDate()
	expiresAt?: Date;
}
