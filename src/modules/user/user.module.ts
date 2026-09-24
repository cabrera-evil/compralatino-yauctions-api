import { Module } from '@nestjs/common';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { FileService } from '../file/file.service';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
	controllers: [UserController],
	providers: [UserService, CloudinaryService, FileService],
	exports: [UserService],
})
export class UserModule {}
