import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { AuditLogController } from './audit-log.controller';
import { AuditLogService } from './audit-log.service';

@Module({
	imports: [UserModule],
	controllers: [AuditLogController],
	providers: [AuditLogService],
})
export class AuditLogModule {}
