import { hashPassword } from '@/utils/bcrypt.util';
import { paginatedResponse, singleResponse } from '@/utils/response.util';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaClient } from 'prisma/generated/client';
import { stripeSensitive } from '../../utils/stripe-sensitive.util';
import { FileService } from '../file/file.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
	constructor(
		private readonly prisma: PrismaClient,
		private readonly fileService: FileService
	) {}

	async findAll(query?: Prisma.UserFindManyArgs) {
		const [data, count] = await Promise.all([
			this.prisma.user.findMany({
				...query,
			}),
			this.prisma.user.count({
				where: query?.where,
			}),
		]);
		return paginatedResponse(data.map(stripeSensitive), count, query);
	}

	async findOne(id: number, query?: Omit<Prisma.UserFindUniqueArgs, 'where'>) {
		const data = await this.prisma.user.findUnique({
			where: { id },
			...query,
		});
		if (!data) throw new NotFoundException('User not found');
		return singleResponse(stripeSensitive(data));
	}

	async create(createUserDto: CreateUserDto, file?: Express.Multer.File) {
		let picture = null;
		if (file) {
			picture = await this.fileService.uploadAndSave(
				file,
				'portfolio/users/profile-pictures',
				`user-${Date.now().toLocaleString()}`
			);
		}
		createUserDto.password = await hashPassword(createUserDto.password);
		const data = await this.prisma.user.create({
			data: {
				...createUserDto,
				...(picture && { picture: picture.id }),
			},
		});
		return singleResponse(stripeSensitive(data));
	}

	async update(
		id: number,
		updateUserDto: UpdateUserDto,
		file?: Express.Multer.File
	) {
		const user = await this.prisma.user.findUnique({
			where: { id },
		});
		if (!user) throw new NotFoundException('User not found');
		let picture = null;
		if (file) {
			picture = await this.fileService.uploadAndSave(
				file,
				'portfolio/users/profile-pictures',
				`user-${Date.now().toLocaleString()}`
			);
		}
		if (updateUserDto.password) {
			updateUserDto.password = await hashPassword(updateUserDto.password);
		}
		const data = await this.prisma.user.update({
			where: { id },
			data: {
				...updateUserDto,
				...(picture && { picture: picture.id }),
			},
		});
		return singleResponse(stripeSensitive(data));
	}

	async remove(id: number) {
		const data = await this.prisma.user.findUnique({
			where: { id },
		});
		if (!data) throw new NotFoundException('User not found');
		await this.prisma.user.delete({
			where: { id },
		});
		return singleResponse(stripeSensitive(data));
	}
}
