export const AppPermissions = {
	// User management
	USERS_CREATE: 'users:create',
	USERS_READ: 'users:read',
	USERS_UPDATE: 'users:update',
	USERS_DELETE: 'users:delete',

	// Role management
	ROLES_CREATE: 'roles:create',
	ROLES_READ: 'roles:read',
	ROLES_UPDATE: 'roles:update',
	ROLES_DELETE: 'roles:delete',

	// Permission management
	PERMISSIONS_READ: 'permissions:read',

	// Audit logs
	AUDIT_LOGS_READ: 'audit-logs:read',

	// API key management (admin-level)
	API_KEYS_READ_ALL: 'api-keys:read-all',

	// File management
	FILES_CREATE: 'files:create',
	FILES_READ: 'files:read',
	FILES_DELETE: 'files:delete',
} as const;

export type PermissionCode =
	(typeof AppPermissions)[keyof typeof AppPermissions];
