import * as bcryptjs from 'bcryptjs';

/**
 * Encrypts a password using bcryptjs.
 */
export async function hashPassword(password: string) {
	return await bcryptjs.hash(password, Number(process.env.SALT_ROUNDS ?? 10));
}
