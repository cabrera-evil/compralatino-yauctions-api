import { Transform } from 'class-transformer';
import {
	IsEnum,
	IsIP,
	IsNotEmpty,
	IsNumber,
	IsObject,
	IsOptional,
	IsString,
} from 'class-validator';
import { AuditAction } from 'prisma/generated/client';

export class CreateAuditLogDto {
	@IsString()
	@IsNotEmpty()
	tableName: string;

	@IsNumber()
	@Transform(({ value }) => Number(value))
	@IsNotEmpty()
	recordId: number;

	@IsEnum(AuditAction)
	@IsNotEmpty()
	action: AuditAction;

	@IsObject()
	@IsOptional()
	values?: Record<string, unknown>;

	@IsIP()
	@IsOptional()
	ipAddress?: string;

	@IsString()
	@IsOptional()
	userAgent?: string;

	@IsNumber()
	@Transform(({ value }) =>
		value === '' || value === null || value === undefined
			? undefined
			: Number(value)
	)
	@IsOptional()
	userId?: number; // maps to user_id
}
