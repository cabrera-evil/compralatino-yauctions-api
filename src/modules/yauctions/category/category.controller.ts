import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoryService } from './category.service';

@ApiTags('yauctions-categories')
@Controller({ path: 'yauctions/categories', version: '1' })
export class CategoryController {
	constructor(private readonly categoryService: CategoryService) {}

	@ApiOperation({
		summary: 'List YAuctions categories with their open lot count (public)',
	})
	@Get()
	findAll() {
		return this.categoryService.findAll();
	}
}
