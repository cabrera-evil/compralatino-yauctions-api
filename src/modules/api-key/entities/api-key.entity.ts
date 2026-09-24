import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiKeyStatus } from 'prisma/generated/client';

export class ApiKeyEntity {
	@ApiProperty({ description: 'API key ID', example: 1 })
	id: number;

	@ApiProperty({
		description: 'Descriptive name for the API key',
		example: 'Production Server Key',
	})
	name: string;

	@ApiProperty({
		description: 'First 8 characters of the API key for identification',
		example: 'AbCdEfGh',
	})
	keyPrefix: string;

	@ApiProperty({
		description: 'Masked API key for display',
		example: 'AbCdEfGh************************************',
	})
	keyMasked: string;

	@ApiProperty({
		description: 'API key status',
		enum: ApiKeyStatus,
		example: ApiKeyStatus.ACTIVE,
	})
	status: ApiKeyStatus;

	@ApiPropertyOptional({
		description: 'Expiration date of the API key',
		example: '2025-12-31T23:59:59Z',
		type: Date,
		nullable: true,
	})
	expiresAt?: Date | null;

	@ApiPropertyOptional({
		description: 'Last time the API key was used',
		example: '2024-01-15T10:30:00Z',
		type: Date,
		nullable: true,
	})
	lastUsedAt?: Date | null;

	@ApiProperty({
		description: 'Creation timestamp',
		example: '2024-01-01T00:00:00Z',
		type: Date,
	})
	createdAt: Date;

	@ApiProperty({
		description: 'Last update timestamp',
		example: '2024-01-15T10:30:00Z',
		type: Date,
	})
	updatedAt: Date;
}

export class ApiKeyWithPlaintextEntity extends ApiKeyEntity {
	@ApiProperty({
		description:
			'Plaintext API key - ONLY returned once during creation. Store this securely.',
		example: 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789+/==',
	})
	key: string;
}
