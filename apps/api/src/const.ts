import { z } from "zod";
import { env } from "./utils/env.utils.js";

export const AI_PROVIDER = {
	MISTRAL: "MISTRAL",
} as const;

export type AiProvider = keyof typeof AI_PROVIDER;

export const AiProviderEnum = z.nativeEnum(AI_PROVIDER);

export const AI_PROVIDERS_CONFIG = {
	[AI_PROVIDER.MISTRAL]: {
		url: "https://api.mistral.ai/v1",
		apiKey: env.MISTRAL_API_KEY,
	},
} as const;

export const AI_AUTOCOMPLETE_MODELS = [
	{
		label: "Mistral Small 3",
		provider: "mistral",
		model: "mistral-small-latest",
	},
] as const;

export const AI_GENERATE_MODELS = [
	{
		label: "Mistral Small 3",
		provider: "mistral",
		model: "mistral-small-latest",
	},
] as const;
