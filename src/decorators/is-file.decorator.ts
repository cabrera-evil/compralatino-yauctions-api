import {
	registerDecorator,
	ValidationArguments,
	ValidationOptions,
} from 'class-validator';

interface IsFileOptions {
	mimeTypes?: string[];
	maxSize?: number; // in bytes
	minSize?: number; // in bytes
	allowEmpty?: boolean;
}

export function IsFile(
	options: IsFileOptions = {},
	validationOptions?: ValidationOptions
) {
	return function (object: object, propertyName: string) {
		registerDecorator({
			name: 'isFile',
			target: object.constructor,
			propertyName: propertyName,
			constraints: [options],
			options: validationOptions,
			validator: {
				validate(value: unknown, args: ValidationArguments) {
					const [constraints] = args.constraints as [IsFileOptions];
					// Allow empty values if allowEmpty is true or if the field is optional
					if (!value) {
						return constraints.allowEmpty ?? false;
					}
					// Check if value is a file-like object
					if (typeof value !== 'object' || value === null) {
						return false;
					}
					const file = value as Express.Multer.File;
					// Validate MIME type
					if (constraints.mimeTypes && constraints.mimeTypes.length > 0) {
						const isValidMimeType = constraints.mimeTypes.some((mimeType) => {
							// Support wildcard patterns like "image/*"
							if (mimeType.includes('*')) {
								const pattern = mimeType.replace('*', '.*');
								return new RegExp(`^${pattern}$`).test(file.mimetype);
							}
							return file.mimetype === mimeType;
						});
						if (!isValidMimeType) {
							return false;
						}
					}
					// Validate file size
					if (file.size !== undefined) {
						if (constraints.maxSize && file.size > constraints.maxSize) {
							return false;
						}
						if (constraints.minSize && file.size < constraints.minSize) {
							return false;
						}
					}
					return true;
				},
				defaultMessage(args: ValidationArguments) {
					const [constraints] = args.constraints as [IsFileOptions];
					const property = args.property;
					const messages: string[] = [];
					if (constraints.mimeTypes && constraints.mimeTypes.length > 0) {
						messages.push(
							`${property} must be a valid file with MIME type: ${constraints.mimeTypes.join(', ')}`
						);
					} else {
						messages.push(`${property} must be a valid file`);
					}
					if (constraints.maxSize) {
						const maxSizeMB = (constraints.maxSize / (1024 * 1024)).toFixed(2);
						messages.push(`maximum size: ${maxSizeMB}MB`);
					}
					if (constraints.minSize) {
						const minSizeMB = (constraints.minSize / (1024 * 1024)).toFixed(2);
						messages.push(`minimum size: ${minSizeMB}MB`);
					}
					return messages.join(', ');
				},
			},
		});
	};
}
