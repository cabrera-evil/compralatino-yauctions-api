/**
 * Sleep for a specified duration.
 * @param ms - The duration to sleep in milliseconds
 */
export function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
