import { env } from "./env.utils.js";

export async function sendWebhook({
	type,
	message,
}: { type: "stripe" | "infra" | "logs"; message: string }) {
	if (!env.LOGS_WEBHOOK_URL) return;
	return fetch(env.LOGS_WEBHOOK_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ type, message }),
	});
}
