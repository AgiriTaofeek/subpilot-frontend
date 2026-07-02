import { classifyError } from "#/lib/api/classify-error.ts";

export function isSessionError(message: string): boolean {
	return classifyError(message) === "auth_expired";
}
