import { SetMetadata } from '@nestjs/common';

export const SKIP_ENCRYPTION_KEY = 'skip_encryption';

/**
 * Decorator to skip encryption/decryption for a controller or handler
 * Useful for health checks, file uploads, and special endpoints
 */
export const SkipEncryption = () => SetMetadata(SKIP_ENCRYPTION_KEY, true);
