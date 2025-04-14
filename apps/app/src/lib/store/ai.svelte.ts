import { getApiClient, t } from "$lib/utils.svelte";
import type { ContentType } from "@getgrinta/api";
import { toast } from "svelte-sonner";

export class AiStore {
  grintAiResult = $state<string>();
  rateLimited = $state<boolean>(false);

  async fetchGrintAiResult(query: string) {
    const maybeJson = await this.generateText({
      prompt: query,
      context: "",
      contentType: "GRINTAI",
    });
    if (!maybeJson) return;
    this.grintAiResult = maybeJson.text;
  }

  async generateText({
    prompt,
    context,
    contentType,
  }: {
    prompt: string;
    context: string;
    contentType: ContentType;
  }) {
    const apiClient = getApiClient();
    const result = await apiClient.api.ai.generate.$post({
      json: {
        prompt,
        context,
        contentType,
      },
    });
    if (!result.ok) {
      if (result.status === 403) {
        toast.error(t("ai.error"), { duration: 30000 });
        this.rateLimited = true;
        return;
      }
      const text = await result.text();
      console.error(text);
      return;
    }
    return result.json();
  }
}

export const aiStore = new AiStore();
