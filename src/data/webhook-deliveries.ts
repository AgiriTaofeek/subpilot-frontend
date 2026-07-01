import type { WebhookEventType } from "#/data/webhooks.ts";

export type DeliveryStatus = "succeeded" | "failed" | "retrying";

export interface WebhookDelivery {
	id: string;
	endpointId: string;
	eventType: WebhookEventType;
	status: DeliveryStatus;
	httpStatus: number | null;
	attempts: number;
	createdAt: string;
	attemptedAt: string;
	durationMs: number | null;
	timedOut: boolean;
	requestHeaders: Record<string, string>;
	requestBody: string;
	responseBody: string;
}

function requestBodyFor(eventType: WebhookEventType, id: string): string {
	return JSON.stringify(
		{
			id,
			type: eventType,
			created: "2026-06-30T09:00:00Z",
			data: { object: { id: `obj_${id.slice(-6)}` } },
		},
		null,
		2,
	);
}

export const webhookDeliveries: WebhookDelivery[] = [
	{
		id: "del_01",
		endpointId: "we_01",
		eventType: "subscription.activated",
		status: "succeeded",
		httpStatus: 200,
		attempts: 1,
		createdAt: "2026-06-30T09:12:00.000Z",
		attemptedAt: "2026-06-30T09:12:01.240Z",
		durationMs: 184,
		timedOut: false,
		requestHeaders: {
			"Content-Type": "application/json",
			"X-SubPilot-Signature": "t=1751... v1=8f2a...",
		},
		requestBody: requestBodyFor("subscription.activated", "del_01"),
		responseBody: '{"received":true}',
	},
	{
		id: "del_02",
		endpointId: "we_01",
		eventType: "invoice.paid",
		status: "succeeded",
		httpStatus: 200,
		attempts: 1,
		createdAt: "2026-06-30T08:40:00.000Z",
		attemptedAt: "2026-06-30T08:40:00.860Z",
		durationMs: 92,
		timedOut: false,
		requestHeaders: {
			"Content-Type": "application/json",
			"X-SubPilot-Signature": "t=1751... v1=1c9d...",
		},
		requestBody: requestBodyFor("invoice.paid", "del_02"),
		responseBody: '{"ok":true}',
	},
	{
		id: "del_03",
		endpointId: "we_02",
		eventType: "payment.failed",
		status: "failed",
		httpStatus: 500,
		attempts: 3,
		createdAt: "2026-06-29T14:20:00.000Z",
		attemptedAt: "2026-06-29T14:22:10.500Z",
		durationMs: 3120,
		timedOut: false,
		requestHeaders: {
			"Content-Type": "application/json",
			"X-SubPilot-Signature": "t=1751... v1=5b3e...",
		},
		requestBody: requestBodyFor("payment.failed", "del_03"),
		responseBody:
			'{"error":"internal_server_error","message":"Unhandled exception in webhook handler."}',
	},
	{
		id: "del_04",
		endpointId: "we_01",
		eventType: "subscription.past_due",
		status: "retrying",
		httpStatus: 503,
		attempts: 2,
		createdAt: "2026-06-30T16:40:00.000Z",
		attemptedAt: "2026-06-30T16:41:00.000Z",
		durationMs: 4020,
		timedOut: false,
		requestHeaders: {
			"Content-Type": "application/json",
			"X-SubPilot-Signature": "t=1751... v1=9a1f...",
		},
		requestBody: requestBodyFor("subscription.past_due", "del_04"),
		responseBody: '{"error":"service_unavailable"}',
	},
	{
		id: "del_05",
		endpointId: "we_02",
		eventType: "payment.succeeded",
		status: "succeeded",
		httpStatus: 201,
		attempts: 1,
		createdAt: "2026-06-29T09:00:00.000Z",
		attemptedAt: "2026-06-29T09:00:00.310Z",
		durationMs: 61,
		timedOut: false,
		requestHeaders: {
			"Content-Type": "application/json",
			"X-SubPilot-Signature": "t=1751... v1=e77c...",
		},
		requestBody: requestBodyFor("payment.succeeded", "del_05"),
		responseBody: '{"status":"created"}',
	},
	{
		id: "del_06",
		endpointId: "we_03",
		eventType: "subscription.activated",
		status: "failed",
		httpStatus: null,
		attempts: 4,
		createdAt: "2026-06-20T09:05:00.000Z",
		attemptedAt: "2026-06-20T09:05:10.000Z",
		durationMs: null,
		timedOut: true,
		requestHeaders: {
			"Content-Type": "application/json",
			"X-SubPilot-Signature": "t=1751... v1=2f6a...",
		},
		requestBody: requestBodyFor("subscription.activated", "del_06"),
		responseBody: "",
	},
	{
		id: "del_07",
		endpointId: "we_01",
		eventType: "invoice.void",
		status: "succeeded",
		httpStatus: 200,
		attempts: 1,
		createdAt: "2026-06-19T10:15:00.000Z",
		attemptedAt: "2026-06-19T10:15:00.412Z",
		durationMs: 128,
		timedOut: false,
		requestHeaders: {
			"Content-Type": "application/json",
			"X-SubPilot-Signature": "t=1751... v1=4d8b...",
		},
		requestBody: requestBodyFor("invoice.void", "del_07"),
		responseBody: '{"received":true}',
	},
	{
		id: "del_08",
		endpointId: "we_02",
		eventType: "subscription.cancelled",
		status: "failed",
		httpStatus: 404,
		attempts: 3,
		createdAt: "2026-06-18T11:00:00.000Z",
		attemptedAt: "2026-06-18T11:02:30.000Z",
		durationMs: 210,
		timedOut: false,
		requestHeaders: {
			"Content-Type": "application/json",
			"X-SubPilot-Signature": "t=1751... v1=7c2e...",
		},
		requestBody: requestBodyFor("subscription.cancelled", "del_08"),
		responseBody: '{"error":"not_found","message":"Route not registered."}',
	},
	{
		id: "del_09",
		endpointId: "we_01",
		eventType: "subscription.resumed",
		status: "succeeded",
		httpStatus: 200,
		attempts: 1,
		createdAt: "2026-06-15T09:30:00.000Z",
		attemptedAt: "2026-06-15T09:30:00.180Z",
		durationMs: 74,
		timedOut: false,
		requestHeaders: {
			"Content-Type": "application/json",
			"X-SubPilot-Signature": "t=1751... v1=b81a...",
		},
		requestBody: requestBodyFor("subscription.resumed", "del_09"),
		responseBody: '{"ok":true}',
	},
	{
		id: "del_10",
		endpointId: "we_02",
		eventType: "invoice.paid",
		status: "succeeded",
		httpStatus: 302,
		attempts: 1,
		createdAt: "2026-06-12T09:00:00.000Z",
		attemptedAt: "2026-06-12T09:00:00.500Z",
		durationMs: 143,
		timedOut: false,
		requestHeaders: {
			"Content-Type": "application/json",
			"X-SubPilot-Signature": "t=1751... v1=0e5f...",
		},
		requestBody: requestBodyFor("invoice.paid", "del_10"),
		responseBody: '{"redirected":true}',
	},
];
