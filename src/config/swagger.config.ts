import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwaggerDoc(app: INestApplication): void {
	const config = new DocumentBuilder()
		.setTitle(process.env.npm_package_name ?? 'NestJS API')
		.setDescription(
			`${process.env.npm_package_description ?? 'Auto-generated Swagger API documentation.'}\n\n` +
				'This documentation covers API version 1. All endpoints use the /api/v1/ prefix ' +
				'except VERSION_NEUTRAL endpoints like /api/health.'
		)
		.setVersion(process.env.npm_package_version ?? '1.0.0')
		.addBearerAuth()
		.addApiKey(
			{
				type: 'apiKey',
				name: 'X-API-Key',
				in: 'header',
				description: 'API key for service authentication',
			},
			'api-key'
		);
	const document = SwaggerModule.createDocument(app, config.build());
	SwaggerModule.setup('api/docs', app, document, {
		swaggerOptions: {
			tagsSorter: 'alpha',
			operationsSorter: 'method',
		},
	});
}
