import { AppPermissions } from '@/constants/permissions';
import { Auth } from '@/decorators/auth.decorator';
import { RisonQuery } from '@/decorators/rison-query.decorator';
import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	UploadedFile,
	UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { Prisma } from 'prisma/generated/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserService } from './user.service';

@ApiTags('user')
@Controller({ path: 'user', version: '1' })
export class UserController {
	constructor(private readonly userService: UserService) {}

	@Auth(AppPermissions.USERS_CREATE)
	@UseInterceptors(FileInterceptor('file'))
	@Post()
	create(
		@Body() payload: CreateUserDto,
		@UploadedFile() file?: Express.Multer.File
	) {
		return this.userService.create(payload, file);
	}

	@Auth(AppPermissions.USERS_READ)
	@ApiQuery({ name: 'name', required: false })
	@Get()
	findAll(@RisonQuery({ paginate: true }) query?: Prisma.UserFindManyArgs) {
		return this.userService.findAll(query);
	}

	@Auth(AppPermissions.USERS_READ)
	@Get(':id')
	findOne(
		@Param('id') id: number,
		@RisonQuery() query?: Omit<Prisma.UserFindUniqueArgs, 'where'>
	) {
		return this.userService.findOne(id, query);
	}

	@Auth(AppPermissions.USERS_UPDATE)
	@UseInterceptors(FileInterceptor('file'))
	@Patch(':id')
	update(
		@Param('id') id: number,
		@Body() payload: UpdateUserDto,
		@UploadedFile() file?: Express.Multer.File
	) {
		return this.userService.update(id, payload, file);
	}

	@Auth(AppPermissions.USERS_DELETE)
	@Delete(':id')
	remove(@Param('id') id: number) {
		return this.userService.remove(id);
	}
}
