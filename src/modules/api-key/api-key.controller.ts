import { AppPermissions } from '@/constants/permissions';
import { Auth } from '@/decorators/auth.decorator';
import { RisonQuery } from '@/decorators/rison-query.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	ParseIntPipe,
	Patch,
	Post,
	Request,
	UseGuards,
} from '@nestjs/common';
import {
	ApiBearerAuth,
	ApiOperation,
	ApiResponse,
	ApiTags,
} from '@nestjs/swagger';
import { ApiKeyService } from './api-key.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import {
	ApiKeyEntity,
	ApiKeyWithPlaintextEntity,
} from './entities/api-key.entity';

@ApiTags('api-keys')
@Controller({ path: 'api-keys', version: '1' })
export class ApiKeyController {
	constructor(private readonly apiKeyService: ApiKeyService) {}

	@ApiBearerAuth()
	@UseGuards(JwtAuthGuard)
	@Post()
	@ApiOperation({
		summary: 'Create a new API key',
		description:
			'Generate a new API key for the authenticated user. The plaintext key is returned only once - store it securely.',
	})
	@ApiResponse({
		status: 201,
		description: 'API key created successfully',
		type: ApiKeyWithPlaintextEntity,
	})
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	create(@Request() req, @Body() createDto: CreateApiKeyDto) {
		return this.apiKeyService.create(req.user.id, createDto);
	}

	@ApiBearerAuth()
	@UseGuards(JwtAuthGuard)
	@Get()
	@ApiOperation({
		summary: 'List user API keys',
		description:
			'Get all API keys belonging to the authenticated user (keys are masked)',
	})
	@ApiResponse({
		status: 200,
		description: 'API keys retrieved successfully',
		type: [ApiKeyEntity],
	})
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	findAll(@Request() req) {
		return this.apiKeyService.findAllByUser(req.user.id);
	}

	@Auth(AppPermissions.API_KEYS_READ_ALL)
	@Get('admin/all')
	@ApiOperation({
		summary: 'List all API keys (Admin)',
		description:
			'Get all API keys in the system. Requires api-keys:read-all permission.',
	})
	@ApiResponse({
		status: 200,
		description: 'API keys retrieved successfully',
		type: [ApiKeyEntity],
	})
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 403, description: 'Forbidden' })
	findAllAdmin(@RisonQuery() query?) {
		return this.apiKeyService.findAll(query);
	}

	@ApiBearerAuth()
	@UseGuards(JwtAuthGuard)
	@Get(':id')
	@ApiOperation({
		summary: 'Get API key details',
		description: 'Get details of a specific API key (key is masked)',
	})
	@ApiResponse({
		status: 200,
		description: 'API key retrieved successfully',
		type: ApiKeyEntity,
	})
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'API key not found' })
	findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
		return this.apiKeyService.findOne(id, req.user.id);
	}

	@ApiBearerAuth()
	@UseGuards(JwtAuthGuard)
	@Patch(':id/revoke')
	@ApiOperation({
		summary: 'Revoke an API key',
		description: 'Revoke an API key, preventing its future use',
	})
	@ApiResponse({
		status: 200,
		description: 'API key revoked successfully',
		type: ApiKeyEntity,
	})
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'API key not found' })
	revoke(@Param('id', ParseIntPipe) id: number, @Request() req) {
		return this.apiKeyService.revoke(id, req.user.id);
	}

	@ApiBearerAuth()
	@UseGuards(JwtAuthGuard)
	@Delete(':id')
	@ApiOperation({
		summary: 'Delete an API key',
		description: 'Permanently delete an API key',
	})
	@ApiResponse({ status: 200, description: 'API key deleted successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'API key not found' })
	remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
		return this.apiKeyService.remove(id, req.user.id);
	}
}
