import { match } from "ts-pattern";
import { until } from "@open-draft/until";
import {
  APP_MODE,
  COMMAND_HANDLER,
  ExecutableCommandSchema,
  type SearchEngine,
  SEARCH_ENGINE,
  COMMAND_PRIORITY,
} from "@getgrinta/core";
import { createPlugin, type PluginContext } from "@getgrinta/plugin";
import { buildCreateNoteCommand } from "./lib/notes";

export async function getSearchUrl({
  query,
  currentSearchEngine,
}: {
  query: string;
  currentSearchEngine: SearchEngine;
}) {
  return match(currentSearchEngine)
    .with(SEARCH_ENGINE.DUCKDUCKGO, () => `https://duckduckgo.com/?q=${query}`)
    .with(
      SEARCH_ENGINE.STARTPAGE,
      () => `https://www.startpage.com/do/search?q=${query}`,
    )
    .with(
      SEARCH_ENGINE.GOOGLE,
      () => `https://www.google.com/search?q=${query}`,
    )
    .with(SEARCH_ENGINE.SCIRA, () => `https://scira.com/search?q=${query}`)
    .exhaustive();
}

export async function fetchCompletions(query: string, context: PluginContext) {
  type CompletionResult = string[];
  const encodedQuery = encodeURIComponent(query);
  const completionUrl = `https://www.startpage.com/osuggestions?q=${encodedQuery}`;
  const { data: response, error: fetchError } = await until(() =>
    context.fetch(completionUrl, {
      headers: { "User-Agent": navigator.userAgent },
    }),
  );
  if (fetchError) {
    context.fail("Failed to fetch completions");
  }
  if (!response) return [query, []] as CompletionResult;
  const { data: json, error: jsonError } = await until<Error, CompletionResult>(
    () => response.json(),
  );
  if (jsonError) {
    context.fail("Failed to parse completions");
  }
  if (!json) return [query, []] as CompletionResult;
  return json;
}

export const PluginWebSearch = createPlugin({
  name: "WebSearch",
  async addSearchResults(query, context) {
    const createNoteCommand =
      query.length > 0 ? [buildCreateNoteCommand(query, context)] : [];
    const queryMatchSearch = [
      ExecutableCommandSchema.parse({
        label: query,
        localizedLabel: query,
        value: await getSearchUrl({
          query,
          currentSearchEngine: context.settings.defaultSearchEngine,
        }),
        handler: COMMAND_HANDLER.URL,
        priority: COMMAND_PRIORITY.MEDIUM,
        appModes: [APP_MODE.INITIAL],
      }),
    ];
    if (query.length < 3) return queryMatchSearch;
    const completions = await fetchCompletions(query, context);
    const completionList = await Promise.all(
      completions.map(async (completion: string) => {
        return ExecutableCommandSchema.parse({
          label: completion,
          localizedLabel: completion,
          value: await getSearchUrl({
            query: completion,
            currentSearchEngine: context.settings.defaultSearchEngine,
          }),
          handler: COMMAND_HANDLER.URL,
          appModes: [APP_MODE.INITIAL],
        });
      }),
    );
    const completionsFiltered = completionList.filter(
      (completion) => completion.label !== query,
    );
    const searchResults = [...completionsFiltered, ...queryMatchSearch];
    return [...searchResults, ...createNoteCommand];
  },
});
