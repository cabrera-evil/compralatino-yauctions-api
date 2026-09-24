import { AUDITABLE_METHODS, METHOD_ACTION_MAP } from '@/constants/audit';
import {
	AUDIT_ENABLED_KEY,
	AUDIT_TABLE_KEY,
} from '@/decorators/audit.decorator';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import {
	CallHandler,
	ExecutionContext,
	Injectable,
	Logger,
	NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { catchError, tap } from 'rxjs/operators';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
	private readonly logger = new Logger(AuditLogInterceptor.name);

	constructor(
		private readonly auditLogService: AuditLogService,
		private readonly reflector: Reflector
	) {}

	intercept(context: ExecutionContext, next: CallHandler) {
		const auditContext = this.buildAuditContext(context);
		if (!auditContext) return next.handle();
		return next.handle().pipe(
			tap((response) =>
				auditContext?.recordId
					? this.auditLogService.createAuditLog({
							...auditContext,
							values: response,
						})
					: null
			),
			catchError((error) => {
				this.logger.debug(`Audit skipped due to error: ${error.message}`);
				throw error;
			})
		);
	}

	private buildAuditContext(context: ExecutionContext) {
		const request = context.switchToHttp().getRequest();
		const response = context.switchToHttp().getResponse();
		const method = request.method?.toLowerCase();
		if (!AUDITABLE_METHODS.has(method) || this.isAuditDisabled(context))
			return null;
		return {
			tableName: this.getTableName(context, request),
			recordId: Number(request?.params?.id ?? response?.data?.id),
			action: METHOD_ACTION_MAP[method],
			ipAddress: this.extractClientIp(request),
			userAgent: request.get('user-agent'),
			userId: request.user?.id,
		};
	}

	private isAuditDisabled(context: ExecutionContext) {
		return (
			this.reflector.getAllAndOverride<boolean>(AUDIT_ENABLED_KEY, [
				context.getHandler(),
				context.getClass(),
			]) === false
		);
	}

	private getTableName(context: ExecutionContext, request: Request) {
		const decoratorTableName = this.reflector.getAllAndOverride<string>(
			AUDIT_TABLE_KEY,
			[context.getHandler(), context.getClass()]
		);
		return (
			decoratorTableName ??
			this.inferTableNameFromRoute(request.route?.path ?? request.url)
		);
	}

	private inferTableNameFromRoute(path: string) {
		if (!path) return null;
		const segments = path
			.split('/')
			.filter(
				(segment) => segment && segment !== 'api' && !segment.startsWith(':')
			);
		if (segments.length === 0) return null;
		return segments[0].toLowerCase();
	}

	private extractClientIp(request: any) {
		const xForwardedFor = request.headers['x-forwarded-for'];
		return (
			(xForwardedFor && xForwardedFor.split(',')[0].trim()) ||
			request.headers['x-real-ip'] ||
			request.ip ||
			request.connection?.remoteAddress ||
			request.socket?.remoteAddress ||
			null
		);
	}
}
