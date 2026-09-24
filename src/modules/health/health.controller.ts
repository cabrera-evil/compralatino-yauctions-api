import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthCheck } from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { SkipEncryption } from '../../decorators/skip-encryption.decorator';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
	constructor(private readonly healthService: HealthService) {}

	@HealthCheck()
	@SkipEncryption()
	@SkipThrottle()
	@Get()
	check() {
		return this.healthService.check();
	}
}
