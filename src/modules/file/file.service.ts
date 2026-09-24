import { Injectable } from '@nestjs/common';
import { PrismaClient } from 'prisma/generated/client';
import slugify from 'slugify';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class FileService {
	constructor(
		private readonly prisma: PrismaClient,
		private readonly cloudinaryService: CloudinaryService
	) {}

	async uploadAndSave(
		file: Express.Multer.File,
		folder: string,
		publicIdBase: string
	) {
		const slug = slugify(publicIdBase, { lower: true });
		const uploadResult = await this.cloudinaryService.uploadFileBuffer(file, {
			folder,
			public_id: slug,
		});
		return await this.prisma.file.create({
			data: {
				assetId: uploadResult.asset_id,
				publicId: uploadResult.public_id,
				format: uploadResult.format,
				version: uploadResult.version,
				resourceType: uploadResult.resource_type,
				type: uploadResult.type,
				bytes: uploadResult.bytes,
				folder: uploadResult.folder,
				accessMode: uploadResult.access_mode,
				url: uploadResult.url ?? uploadResult.secure_url,
				secureUrl: uploadResult.secure_url,
				createdAt: uploadResult.created_at
					? new Date(uploadResult.created_at)
					: new Date(),
			},
		});
	}

	async findById(id: number) {
		return this.prisma.file.findUnique({
			where: { id },
		});
	}

	async update(
		id: number,
		file: Express.Multer.File,
		folder: string,
		publicIdBase: string
	) {
		const oldImage = await this.findById(id);
		if (oldImage) {
			await this.cloudinaryService.deleteAsset(oldImage.publicId);
		}
		const slug = slugify(publicIdBase, { lower: true });
		const uploadResult = await this.cloudinaryService.uploadFileBuffer(file, {
			folder,
			public_id: slug,
		});
		return await this.prisma.file.update({
			where: { id },
			data: {
				assetId: uploadResult.asset_id,
				publicId: uploadResult.public_id,
				format: uploadResult.format,
				version: uploadResult.version,
				resourceType: uploadResult.resource_type,
				type: uploadResult.type,
				bytes: uploadResult.bytes,
				folder: uploadResult.folder,
				accessMode: uploadResult.access_mode,
				url: uploadResult.url ?? uploadResult.secure_url,
				secureUrl: uploadResult.secure_url,
				createdAt: uploadResult.created_at
					? new Date(uploadResult.created_at)
					: new Date(),
			},
		});
	}

	async remove(id: number) {
		const image = await this.findById(id);
		if (!image) return false;
		await Promise.all([
			this.prisma.file.delete({ where: { id } }),
			this.cloudinaryService.deleteAsset(image.publicId),
		]);
		return true;
	}
}
