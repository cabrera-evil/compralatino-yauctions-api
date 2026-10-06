import slugify from 'slugify';

const MAX_CODE_LENGTH = 96;

// Category code = stable slug of the source name; a clash with another source id gets the id suffix.
export class YacCategoryCodes {
	private readonly bySourceId = new Map<string, string>();
	private readonly used = new Set<string>();

	constructor(
		existing: Iterable<{ sourceCategoryId: string; code: string }> = []
	) {
		for (const { sourceCategoryId, code } of existing) {
			this.bySourceId.set(sourceCategoryId, code);
			this.used.add(code);
		}
	}

	resolve(sourceCategoryId: string, name: string): string {
		const known = this.bySourceId.get(sourceCategoryId);
		if (known) return known;
		const slug =
			slugify(name, { lower: true, strict: true }).slice(
				0,
				MAX_CODE_LENGTH - 24
			) || 'category';
		const code = this.used.has(slug) ? `${slug}-${sourceCategoryId}` : slug;
		this.bySourceId.set(sourceCategoryId, code);
		this.used.add(code);
		return code;
	}
}
