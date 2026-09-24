import { ApiKeyAuthGuard } from '@/guards/api-key-auth.guard';
import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { ApiSecurity } from '@nestjs/swagger';

export const API_KEY_AUTH_ENABLED = 'api_key_auth_enabled';

/**
 * Enable API key authentication for this endpoint
 * Applies ApiKeyAuthGuard and OpenAPI api-key security scheme automatically.
 */
export const ApiKeyAuth = () =>
	applyDecorators(
		SetMetadata(API_KEY_AUTH_ENABLED, true),
		UseGuards(ApiKeyAuthGuard),
		ApiSecurity('api-key')
	);
