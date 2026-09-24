import { CloudinaryResponse } from '@/types/cloudinary-response.type';
import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { unlink } from 'fs/promises';
import { Readable } from 'stream';
import { CreateUploadDto } from './dto/create-upload.dto';

@Injectable()
export class CloudinaryService {
	/**
	 * Uploads a file buffer to Cloudinary using stream
	 */
	async uploadFileBuffer(
		file: Express.Multer.File,
		options: CreateUploadDto
	): Promise<CloudinaryResponse> {
		return new Promise<CloudinaryResponse>((resolve, reject) => {
			const stream = cloudinary.uploader.upload_stream(
				{
					folder: options.folder,
					public_id: options.public_id,
					resource_type: 'auto',
				},
				(error, result) => {
					if (error) return reject(error as Error);
					resolve(result as CloudinaryResponse);
				}
			);
			Readable.from(file.buffer).pipe(stream);
		});
	}

	/**
	 * Uploads a local file path to Cloudinary
	 */
	async uploadFromPath(
		filePath: string,
		options: CreateUploadDto,
		deleteAfter = true
	): Promise<CloudinaryResponse> {
		const result = await cloudinary.uploader.upload(filePath, {
			folder: options.folder,
			public_id: options.public_id,
			resource_type: 'auto',
		});
		if (deleteAfter) await unlink(filePath); // Cleanup
		return result as CloudinaryResponse;
	}

	/**
	 * Deletes an asset by public ID
	 */
	async deleteAsset(publicId: string): Promise<{ result: string }> {
		return await cloudinary.uploader.destroy(publicId, {
			invalidate: true,
		});
	}

	/**
	 * Generates a Cloudinary URL with optional transformations
	 */
	generateUrl(publicId: string, options: Record<string, unknown> = {}): string {
		return cloudinary.url(publicId, options);
	}
}
