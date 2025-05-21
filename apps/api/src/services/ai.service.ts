// import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createMistral } from "@ai-sdk/mistral";
import {
  convertToCoreMessages,
  generateText,
  smoothStream,
  streamText,
  tool,
} from "ai";
import dedent from "dedent";
import { match } from "ts-pattern";
import { z } from "zod/v3";
import { AI_PROVIDERS_CONFIG, type AiProvider } from "../const.js";
import { CONTENT_TYPE, type ContentType } from "../routers/ai.router.js";
import { type ChatMessageData } from "@getgrinta/core";

const RESPONSE_REGEX = /<response>([\s\S]*?)<\/response>/;

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
	1. Your task is to generate a new paragraph of text based on the provided prompt in <request></request> tag and the additional information in the <context></context>.
	2. Output Format: Return only the continuation of the paragraph wrapped in an XML <response> tag. Do not include any additional text or explanations.
`;

export const REPHRASE_SYSTEM_PROMPT = dedent`
	You are a highly intelligent note-taking AI assistant.
	1. Your task is to rephrase the provided text in a way provided in the <context></context> tag. The text to rephrase is provided in the <request></request> tag.
	2. Output Format: Return only the continuation of the paragraph wrapped in an XML <response> tag. Do not include any additional text or explanations.
`;

export const GRINTAI_SYSTEM_PROMPT = dedent`
  You are a highly intelligent AI assistant.
	1. Your task is to provide concise and informative summaries for the prompts in <request></request> tag.
	2. Output Format: Return only the continuation of the paragraph wrapped in an XML <response> tag. Do not include any additional text or explanations.
`;

export const BROWSER_AGENT_CHAT_TITLE_PROMPT = dedent`
  Provide a concise and informative title based on the provided content.
  1. The title should be at most 6 words long.
  2. Output Format: Return only the title wrapped in an XML <response> tag. Do not include any additional text or explanations.
`;

export const BROWSER_AGENT_SYSTEM_PROMPT = dedent`
  You are a browser AI agent that helps users understand and reason about web pages.
  For every user query, ALWAYS use the "getTabContent" function to retrieve the current page content.

  Core Instructions:
  - Focus on extracting and conveying meaning, context, and insights from the page content.
  - Disregard HTML, markdown, UI scaffolding, and other purely presentational elements. Your job is to distill information, not formatting.

  Interaction Principles:
  - Prioritize what the user wants to know—respond directly and concisely.
  - Do not hallucinate or assume content that isn't present in the tab.
  - Be helpful, accurate, and focused on the user's reasoning needs.
`;

export class AiService {
  createModel({ provider, model }: { provider: AiProvider; model: string }) {
    return createMistral({
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
      .with(CONTENT_TYPE.GRINTAI, () => GRINTAI_SYSTEM_PROMPT)
      .with(CONTENT_TYPE.CHAT_TITLE, () => BROWSER_AGENT_CHAT_TITLE_PROMPT)
      .exhaustive();
    const { text } = await generateText({
      prompt,
      system,
      model,
    });
    return text.match(RESPONSE_REGEX)?.[1] ?? "";
  }

  streamResponse(params: ChatMessageData, onFinish: () => Promise<void>) {
    const model = this.createModel({
      provider: "MISTRAL",
      model: "mistral-small-latest",
    });
    return streamText({
      maxSteps: 5,
      messages: convertToCoreMessages(params.messages as never),
      system: BROWSER_AGENT_SYSTEM_PROMPT,
      toolCallStreaming: true,
      experimental_transform: smoothStream({
        chunking: "line",
      }),
      onFinish,
      model,
      tools: {
        getTabContent: tool({
          parameters: z.object({}),
          description:
            "Get the contents of the current browser tab page. The result is a markdown content of the page, title, and URL.",
        }),
        getElements: tool({
          parameters: z.object({}),
          description:
            "Get the clickable and fillable elements of the current browser tab page. The result is a list of selectors of the clickable and fillable elements.",
        }),
        clickElement: tool({
          parameters: z.object({
            selector: z.string(),
          }),
          description:
            "Click the element with the given selector. The result is a boolean value indicating whether the element was clicked.",
        }),
        fillElement: tool({
          parameters: z.object({
            selector: z.string(),
            value: z.string(),
          }),
          description:
            "Fill the element with the given selector with the given value. The result is a boolean value indicating whether the element was filled.",
        }),
        scrollToElement: tool({
          parameters: z.object({
            selector: z.string(),
          }),
          description:
            "Scroll to the element of the tab page with the given selector. The result is a boolean value indicating whether the element was scrolled to.",
        }),
        getElement: tool({
          parameters: z.object({
            selector: z.string(),
          }),
          description:
            "Get the content of the element of the tab page with the given selector. The result is a markdown content of the element.",
        }),
      },
    });
  }
}
