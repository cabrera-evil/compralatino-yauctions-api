import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { FileService } from './file.service';

@Module({
	imports: [CloudinaryModule],
	providers: [FileService],
})
export class FileModule {}
