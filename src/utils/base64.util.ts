/**
 * Encodes a string into Base64.
 */
export function toBase64(input: string): string {
	return Buffer.from(input, 'utf-8').toString('base64');
}

/**
 * Decodes a Base64 string back to plain text.
 */
export function fromBase64(base64: string): string {
	return Buffer.from(base64, 'base64').toString('utf-8');
}
