import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, streamText } from "ai";
import dedent from "dedent";
import { match } from "ts-pattern";
import { z } from "zod";
import { AI_PROVIDERS_CONFIG, type AiProvider } from "../const.js";
import { CONTENT_TYPE, type ContentType } from "../routers/ai.router.js";

export const ModelSchema = z.object({
	label: z.string(),
	provider: z.string(),
	model: z.string(),
});

export const AUTOCOMPLETE_SYSTEM_PROMPT = dedent`
	You are a highly intelligent note-taking AI assistant. 
	Your task is to suggest the most likely continuation of a paragraph based on the user's input provided in the <request></request> tag and context provided in <context></context>.

	Guidelines:
	1. Completion Length: Until you are confident about how to complete the paragraph, provide only up to 3 words.
	2. Language and Punctuation: Ensure correct punctuation and grammar for the given language.
		- If the user's input ends with a punctuation mark, prepend a whitespace to your response.
		- If you autocomplete a word, do not include a trailing whitespace.
	3. Whitespace Handling: Pay attention to preceding whitespaces to ensure proper formatting.
	4. Nonsensical Input: If the user's input is incoherent or nonsensical, do not generate a response.
	5. Output Format: Return only the continuation of the paragraph wrapped in an XML <response> tag. Do not include any additional text or explanations.

	Example Input:
	<request>Hello </request>
	<context>My context</context>

	Example Output:
	<response>World</response>
`;

export const INLINE_SYSTEM_PROMPT = dedent`
	You are a highly intelligent note-taking AI assistant.
	Your task is to generate a new paragraph of text based on the provided prompt and the additional information in the <context></context>.
`;

export const REPHRASE_SYSTEM_PROMPT = dedent`
	You are a highly intelligent note-taking AI assistant.
	Your task is to rephrase the provided text in a way provided in the <request></request> tag. The text to rephrase is provided in the <context></context> tag.
`;

export class AiService {
	createModel({ provider, model }: { provider: AiProvider; model: string }) {
		return createOpenAICompatible({
			name: "Grinta",
			apiKey: AI_PROVIDERS_CONFIG[provider].apiKey,
			baseURL: AI_PROVIDERS_CONFIG[provider].url,
		})(model);
	}

	formatPrompt({ context, request }: { context: string; request: string }) {
		return dedent`
            <request>${request}</request>
            <context>${context}</context>
        `;
	}

	getGenerateNoteSystemPrompt({ context }: { context: string }) {
		return dedent`
            You are a highly intelligent note-taking AI assistant.
            Your task is to create a note based on the user's query provided in the <request></request> tag.
    
            Guidelines:
            1. Generate a note which covers the topic of the <request></request> tag.
            2. If the context is provided, take it into account when generating the response.
            3. Be concise and to the point in your responses.
            4. Nonsensical Input: If the user's input is incoherent or nonsensical, do not generate a response.
            ${context}
    
            Example Input:
            <request>User provided note title</request>
            
            Example Output:
            <response>Your response here</response>
        `;
	}

	async generateResponse(params: {
		prompt: string;
		context: string;
		provider: AiProvider;
		model: string;
		contentType: ContentType;
	}) {
		const model = this.createModel({
			provider: params.provider,
			model: params.model,
		});
		const prompt = this.formatPrompt({
			context: params.context,
			request: params.prompt,
		});
		const system = match(params.contentType)
			.with(CONTENT_TYPE.AUTOCOMPLETION, () => AUTOCOMPLETE_SYSTEM_PROMPT)
			.with(CONTENT_TYPE.INLINE_AI, () => INLINE_SYSTEM_PROMPT)
			.with(CONTENT_TYPE.REPHRASE, () => REPHRASE_SYSTEM_PROMPT)
			.exhaustive();
		const { text } = await generateText({
			prompt,
			system,
			model,
		});
		return text;
	}

	streamResponse(params: {
		prompt: string;
		context: string;
		provider: AiProvider;
		model: string;
	}) {
		const model = this.createModel({
			provider: params.provider,
			model: params.model,
		});
		const prompt = `<request>${params.prompt}</request>`;
		const system = this.getGenerateNoteSystemPrompt({
			context: params.context,
		});
		const stream = streamText({
			prompt,
			system,
			model,
		});
		return stream.toDataStream();
	}
}
