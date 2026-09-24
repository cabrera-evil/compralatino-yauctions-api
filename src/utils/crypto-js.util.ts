import * as CryptoJS from 'crypto-js';

/**
 * Encrypts data using CryptoJS AES with a passphrase and returns base64 string
 * @param data - The plaintext object/string to encrypt
 * @param passphrase - The encryption passphrase (from env var)
 * @returns Base64 encoded encrypted string
 */
export const encryptWithCryptoJS = (data: any, passphrase: string): string => {
	try {
		const jsonString = typeof data === 'string' ? data : JSON.stringify(data);
		const encrypted = CryptoJS.AES.encrypt(jsonString, passphrase);
		return encrypted.toString(); // Returns base64 by default
	} catch (error) {
		throw new Error(`Encryption failed: ${error.message}`);
	}
};

/**
 * Decrypts a base64 CryptoJS AES encrypted string using a passphrase
 * @param encryptedBase64 - The base64 encrypted string
 * @param passphrase - The decryption passphrase (from env var)
 * @returns Decrypted object or string
 */
export const decryptWithCryptoJS = (
	encryptedBase64: string,
	passphrase: string
): any => {
	try {
		const decrypted = CryptoJS.AES.decrypt(encryptedBase64, passphrase);
		const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);

		if (!decryptedString) {
			throw new Error(
				'Decryption resulted in empty string - invalid key or corrupted data'
			);
		}

		// Try to parse as JSON, fall back to string
		try {
			return JSON.parse(decryptedString);
		} catch {
			return decryptedString;
		}
	} catch (error) {
		throw new Error(`Decryption failed: ${error.message}`);
	}
};

/**
 * Validates if a string is potentially encrypted base64
 * @param data - The string to validate
 * @returns Boolean indicating if string looks like encrypted data
 */
export const isEncryptedFormat = (data: string): boolean => {
	if (!data || typeof data !== 'string') return false;

	// CryptoJS encrypted strings are base64 and start with "U2FsdGVk" (base64 for "Salted__")
	// or are valid base64 strings with reasonable length
	const base64Regex = /^[A-Za-z0-9+/=]+$/;
	return base64Regex.test(data) && data.length > 20;
};
