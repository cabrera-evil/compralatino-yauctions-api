export class YacSourceError extends Error {
	constructor(message: string) {
		super(message);
		this.name = new.target.name;
	}
}

// Redacted GRAPHQL_VALIDATION_FAILED: the source schema changed, never retried.
export class YacSchemaChangedError extends YacSourceError {}

export class YacRateLimitedError extends YacSourceError {}

export class YacHttpError extends YacSourceError {
	constructor(
		message: string,
		readonly status: number
	) {
		super(message);
	}
}
