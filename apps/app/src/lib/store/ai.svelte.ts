import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, smoothStream, streamText } from "ai";
import dedent from "dedent";
import { settingsStore } from "./settings.svelte";

const RESPONSE_REGEX = /<response>(.*?)<\/response>/;

export class AiStore {
	bearerToken = $derived(`Bearer ${settingsStore.settings.aiSecretKey}`);
	client = $derived(
		createOpenAICompatible({
			name: "grinta",
			headers: {
				Authorization: this.bearerToken,
			},
			baseURL: settingsStore.settings.aiEndpointUrl.replace(/chat\/completions\/?/, '').trim(),
		}),
	);
	model = $derived(this.client(settingsStore.settings.aiModelName));

	async generateText(prompt: string) {
		return generateText({
			model: this.model,
			prompt,
		});
	}

	async generateNoteText(query: string) {
		const prompt = this.getGenerateNoteTextPrompt({ 
			query,
			context: settingsStore.settings.aiAdditionalContext 
		});
		
		return generateText({
			model: this.model,
			prompt,
		});
	}
	
	getGenerateNoteTextPrompt({
		query,
		context,
	}: { query: string; context: string }) {
		return dedent`
			You are a highly intelligent note-taking AI assistant.
			Your task is to create a note based on the user's query provided in the <request></request> tag taking into account additional context provided in the <context></context> tag, which should affect your response.

			Guidelines:
			1. Generate a note which covers the topic of the <request></request> tag.
			2. If the context is provided, take it into account when generating the response.
			3. Be concise and to the point in your responses.
			4. Nonsensical Input: If the user's input is incoherent or nonsensical, do not generate a response.

			Example Input:
			<request>${query}</request>
			<context>${context}</context>
			
			Example Output:
			<response>Your response here</response>
		`;
	}

	streamNoteText(query: string) {
		const prompt = this.getGenerateNoteTextPrompt({ 
			query,
			context: settingsStore.settings.aiAdditionalContext 
		});
		
		return streamText({
			model: this.model,
			prompt,
			experimental_transform: smoothStream({
				chunking: "line",
			}),
		});
	}

	getAutocompletePrompt({
		query
	}: { query: string }) {
		return dedent`
			You are a highly intelligent note-taking AI assistant. 
			Your task is to suggest the most likely continuation of a paragraph based on the user's input provided in the <request></request> tag.

			Guidelines:
			1. Completion Length: Until you are confident about how to complete the paragraph, provide only up to 3 words.
			2. Language and Punctuation: Ensure correct punctuation and grammar for the given language.
				- If the user's input ends with a punctuation mark, prepend a whitespace to your response.
				- If you autocomplete a word, do not include a trailing whitespace.
			3. Whitespace Handling: Pay attention to preceding whitespaces to ensure proper formatting.
			4. Nonsensical Input: If the user's input is incoherent or nonsensical, do not generate a response.
			5. Output Format: Return only the continuation of the paragraph wrapped in an XML <response> tag. Do not include any additional text or explanations.

			Example Input:
			<request>${query}</request>

			Example Output:
			<response>Your continuation here</response>
		`;
	}

	async generateAutocompletion(completeProps: {
		query: string;
	}) {
		const prompt = this.getAutocompletePrompt({ 
			query: completeProps.query
		});
		const { text } = await this.generateText(prompt);
		return text.match(RESPONSE_REGEX)?.[1] ?? "";
	}

	async testConnection(): Promise<{ success: boolean; message: string }> {
		try {
			const testQuery = "Hello, this is a connection test.";
			
			if (!settingsStore.settings.aiEndpointUrl) {
				return { success: false, message: "AI endpoint URL is not configured" };
			}
			
			if (!settingsStore.settings.aiSecretKey) {
				return { success: false, message: "API secret key is not configured" };
			}
			
			if (!settingsStore.settings.aiModelName) {
				return { success: false, message: "AI model name is not configured" };
			}
			
			await this.generateText(testQuery);
			return { success: true, message: "Connection successful" };
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
			return { success: false, message: `Connection failed: ${errorMessage}` };
		}
	}
}

export const aiStore = new AiStore();
