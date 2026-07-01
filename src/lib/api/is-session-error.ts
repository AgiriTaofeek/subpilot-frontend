export function isSessionError(message: string): boolean {
	const lower = message.toLowerCase();
	return lower.includes("forbidden") || lower.includes("unauthorized");
}
