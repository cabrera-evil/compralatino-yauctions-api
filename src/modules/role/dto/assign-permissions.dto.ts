import { IsArray, IsInt, IsPositive } from 'class-validator';

export class AssignPermissionsDto {
	@IsArray()
	@IsInt({ each: true })
	@IsPositive({ each: true })
	permissionIds: number[];
}
