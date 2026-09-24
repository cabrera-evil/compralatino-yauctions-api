import { AuditAction } from 'prisma/generated/enums';

export const AUDITABLE_METHODS = new Set(['post', 'patch', 'put', 'delete']);
export const METHOD_ACTION_MAP: Record<string, AuditAction> = {
	post: AuditAction.CREATE,
	patch: AuditAction.UPDATE,
	put: AuditAction.UPDATE,
	delete: AuditAction.DELETE,
};
