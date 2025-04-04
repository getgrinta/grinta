import packageJson from "../package.json";
import { sendWebhook } from "../src/utils/webhook.utils.js";

export async function notifyDeployed() {
	await sendWebhook({
		type: "infra",
		message: `API version ${packageJson.version} deployed.`,
	});
}

notifyDeployed();
