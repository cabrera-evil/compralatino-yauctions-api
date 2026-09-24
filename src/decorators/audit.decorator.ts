import { SetMetadata } from '@nestjs/common';

export const AUDIT_ENABLED_KEY = 'audit_enabled';
export const AUDIT_TABLE_KEY = 'audit_table';

/**
 * Decorator to enable or disable audit logging for a controller or handler
 * @param enabled - Whether to enable audit logging (default: true)
 */
export const Audit = (enabled: boolean = true) =>
	SetMetadata(AUDIT_ENABLED_KEY, enabled);

/**
 * Decorator to specify the table name for audit logging
 * @param tableName - The name of the table to audit
 */
export const AuditTable = (tableName: string) =>
	SetMetadata(AUDIT_TABLE_KEY, tableName);
