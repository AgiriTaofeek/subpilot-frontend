export type ApiKeyStatus = "active" | "revoked";

export interface ApiKey {
	id: string;
	label: string;
	prefix: string;
	status: ApiKeyStatus;
	createdAt: string;
	lastUsedAt: string | null;
}

export function generateApiKey(): { raw: string; prefix: string } {
	const raw = `sk_live_${crypto.randomUUID().replace(/-/g, "")}`;
	const prefix = raw.slice(0, 16);
	return { raw, prefix };
}

export const apiKeys: ApiKey[] = [
	{
		id: "key_01",
		label: "Production billing worker",
		prefix: "sk_live_4f2a8b91",
		status: "active",
		createdAt: "2026-05-01T09:00:00.000Z",
		lastUsedAt: "2026-06-30T14:00:00.000Z",
	},
	{
		id: "key_02",
		label: "Staging integration tests",
		prefix: "sk_live_9c1e2d34",
		status: "active",
		createdAt: "2026-06-10T09:00:00.000Z",
		lastUsedAt: null,
	},
	{
		id: "key_03",
		label: "Legacy reporting script",
		prefix: "sk_live_7a3f0b55",
		status: "revoked",
		createdAt: "2026-02-15T09:00:00.000Z",
		lastUsedAt: "2026-04-01T09:00:00.000Z",
	},
];
