import { singleResponse } from '@/utils/response.util';
import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { ApiKeyStatus, PrismaClient } from 'prisma/generated/client';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@Injectable()
export class ApiKeyService {
	constructor(private readonly prisma: PrismaClient) {}

	/**
	 * Generate a cryptographically secure API key
	 * @returns Base64 encoded 32-byte random string
	 */
	generateApiKey(): string {
		return randomBytes(32).toString('base64');
	}

	/**
	 * Hash an API key using SHA256
	 * @param apiKey - The plaintext API key
	 * @returns SHA256 hash of the API key
	 */
	hashApiKey(apiKey: string): string {
		return createHash('sha256').update(apiKey).digest('hex');
	}

	/**
	 * Extract key prefix for UI identification (first 8 characters)
	 * @param apiKey - The plaintext API key
	 * @returns First 8 characters of the key
	 */
	private getKeyPrefix(apiKey: string): string {
		return apiKey.substring(0, 8);
	}

	/**
	 * Create a new API key for a user
	 * @param userId - User ID to associate with the key
	 * @param name - Descriptive name for the key
	 * @param expiresAt - Optional expiration date
	 * @returns Object containing the plaintext key (only returned once) and metadata
	 */
	async create(userId: number, createDto: CreateApiKeyDto) {
		const plainKey = this.generateApiKey();
		const hashedKey = this.hashApiKey(plainKey);
		const keyPrefix = this.getKeyPrefix(plainKey);

		const apiKey = await this.prisma.apiKey.create({
			data: {
				key: hashedKey,
				name: createDto.name,
				keyPrefix,
				status: ApiKeyStatus.ACTIVE,
				expiresAt: createDto.expiresAt,
				userId,
			},
			include: {
				user: {
					select: {
						id: true,
						username: true,
						email: true,
						roles: { select: { id: true, name: true } },
					},
				},
			},
		});

		// Return the plaintext key only once
		return singleResponse({
			id: apiKey.id,
			name: apiKey.name,
			key: plainKey, // CRITICAL: Only returned once
			keyPrefix: apiKey.keyPrefix,
			status: apiKey.status,
			expiresAt: apiKey.expiresAt,
			createdAt: apiKey.createdAt,
			user: apiKey.user,
		});
	}

	/**
	 * Find all API keys for a user (masked)
	 * @param userId - User ID
	 * @returns Array of API keys with masked key values
	 */
	async findAllByUser(userId: number) {
		const apiKeys = await this.prisma.apiKey.findMany({
			where: { userId },
			select: {
				id: true,
				name: true,
				keyPrefix: true,
				status: true,
				expiresAt: true,
				lastUsedAt: true,
				createdAt: true,
				updatedAt: true,
			},
			orderBy: { createdAt: 'desc' },
		});

		return singleResponse(
			apiKeys.map((key) => ({
				...key,
				keyMasked: `${key.keyPrefix}${'*'.repeat(36)}`, // Show prefix + masked characters
			}))
		);
	}

	/**
	 * Find all API keys (admin only)
	 * @param query - Query parameters for filtering
	 * @returns Array of all API keys
	 */
	async findAll(query?: any) {
		const apiKeys = await this.prisma.apiKey.findMany({
			select: {
				id: true,
				name: true,
				keyPrefix: true,
				status: true,
				expiresAt: true,
				lastUsedAt: true,
				createdAt: true,
				updatedAt: true,
				user: {
					select: {
						id: true,
						username: true,
						email: true,
						roles: { select: { id: true, name: true } },
					},
				},
			},
			orderBy: { createdAt: 'desc' },
			...query,
		});

		return singleResponse(
			apiKeys.map((key) => ({
				...key,
				keyMasked: `${key.keyPrefix}${'*'.repeat(36)}`,
			}))
		);
	}

	/**
	 * Find a specific API key by ID for a user
	 * @param id - API key ID
	 * @param userId - User ID
	 * @returns API key details
	 */
	async findOne(id: number, userId: number) {
		const apiKey = await this.prisma.apiKey.findFirst({
			where: { id, userId },
			select: {
				id: true,
				name: true,
				keyPrefix: true,
				status: true,
				expiresAt: true,
				lastUsedAt: true,
				createdAt: true,
				updatedAt: true,
			},
		});

		if (!apiKey) {
			throw new NotFoundException('API key not found');
		}

		return singleResponse({
			...apiKey,
			keyMasked: `${apiKey.keyPrefix}${'*'.repeat(36)}`,
		});
	}

	/**
	 * Validate an API key and return the associated user
	 * @param plainKey - The plaintext API key
	 * @returns User object if valid, null otherwise
	 */
	async validateKey(plainKey: string) {
		if (!plainKey) return null;

		const hashedKey = this.hashApiKey(plainKey);

		const apiKey = await this.prisma.apiKey.findUnique({
			where: { key: hashedKey },
			include: {
				user: {
					select: {
						id: true,
						username: true,
						firstName: true,
						lastName: true,
						email: true,
						roles: { select: { id: true, name: true } },
						provider: true,
						emailVerified: true,
						profileCompleted: true,
						lastLoginAt: true,
						createdAt: true,
						updatedAt: true,
					},
				},
			},
		});

		if (!apiKey) return null;

		// Check if key is revoked
		if (apiKey.status === ApiKeyStatus.REVOKED) return null;

		// Check if key is expired
		if (apiKey.status === ApiKeyStatus.EXPIRED) return null;

		// Check expiration date
		if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
			// Auto-expire the key
			await this.prisma.apiKey.update({
				where: { id: apiKey.id },
				data: { status: ApiKeyStatus.EXPIRED },
			});
			return null;
		}

		// Constant-time comparison to prevent timing attacks
		const storedKeyBuffer = Buffer.from(apiKey.key, 'hex');
		const providedKeyBuffer = Buffer.from(hashedKey, 'hex');

		if (storedKeyBuffer.length !== providedKeyBuffer.length) return null;

		const isValid = timingSafeEqual(storedKeyBuffer, providedKeyBuffer);

		if (!isValid) return null;

		return apiKey.user;
	}

	/**
	 * Update last used timestamp for an API key (async, fire-and-forget)
	 * @param plainKey - The plaintext API key
	 */
	async updateLastUsed(plainKey: string): Promise<void> {
		try {
			const hashedKey = this.hashApiKey(plainKey);
			await this.prisma.apiKey.updateMany({
				where: {
					key: hashedKey,
					status: ApiKeyStatus.ACTIVE,
				},
				data: {
					lastUsedAt: new Date(),
				},
			});
		} catch (error) {
			// Silently fail to avoid blocking requests
		}
	}

	/**
	 * Revoke an API key
	 * @param id - API key ID
	 * @param userId - User ID (for authorization)
	 * @returns Updated API key
	 */
	async revoke(id: number, userId: number) {
		const apiKey = await this.prisma.apiKey.findFirst({
			where: { id, userId },
		});

		if (!apiKey) {
			throw new NotFoundException('API key not found');
		}

		const updated = await this.prisma.apiKey.update({
			where: { id },
			data: { status: ApiKeyStatus.REVOKED },
			select: {
				id: true,
				name: true,
				keyPrefix: true,
				status: true,
				expiresAt: true,
				lastUsedAt: true,
				createdAt: true,
				updatedAt: true,
			},
		});

		return singleResponse({
			...updated,
			keyMasked: `${updated.keyPrefix}${'*'.repeat(36)}`,
		});
	}

	/**
	 * Delete an API key
	 * @param id - API key ID
	 * @param userId - User ID (for authorization)
	 */
	async remove(id: number, userId: number) {
		const apiKey = await this.prisma.apiKey.findFirst({
			where: { id, userId },
		});

		if (!apiKey) {
			throw new NotFoundException('API key not found');
		}

		await this.prisma.apiKey.delete({
			where: { id },
		});

		return singleResponse({ message: 'API key deleted successfully' });
	}
}
