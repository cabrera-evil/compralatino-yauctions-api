import { CloudinaryProvider } from '@/modules/cloudinary/cloudinary.provider';
import {
	v2 as cloudinary,
	UploadApiResponse,
	type ResourceApiResponse,
} from 'cloudinary';
import { Prisma, PrismaClient } from 'prisma/generated/client';

CloudinaryProvider.useFactory();

const bulk: readonly string[] = [];

function toFileCreateInput(r: ResourceApiResponse) {
	const resource = r as unknown as UploadApiResponse;
	return {
		assetId: resource.asset_id,
		publicId: resource.public_id,
		format: resource.format,
		version: resource.version,
		resourceType: resource.resource_type,
		type: resource.type,
		bytes: resource.bytes,
		folder: resource.folder,
		accessMode: resource.access_mode,
		url: resource.url ?? resource.secure_url,
		secureUrl: resource.secure_url,
		createdAt: resource.created_at ? new Date(resource.created_at) : new Date(),
	} satisfies Prisma.FileCreateInput;
}

export const seedFiles = async (prisma: PrismaClient) => {
	console.log('[seed:files] seeding...');
	const settled = await Promise.allSettled<ResourceApiResponse>(
		bulk.map((id) => cloudinary.api.resource(id))
	);
	const seeded = [];
	for (const res of settled) {
		if (res.status === 'fulfilled') {
			const data = toFileCreateInput(res.value);
			const seed = await prisma.file.upsert({
				where: { publicId: data.publicId },
				update: data,
				create: data,
			});
			seeded.push(seed);
			console.log(`[seed:files] upserted publicId=${seed.publicId}`);
		} else
			console.warn(
				'[seed:files] failed to fetch Cloudinary resource',
				res.reason
			);
	}

	return seeded;
};
