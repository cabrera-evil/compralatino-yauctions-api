// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function stripeSensitive(payload: any) {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { password, resetToken, ...rest } = payload;
	return rest;
}
