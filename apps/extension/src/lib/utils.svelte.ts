import type { z } from "zod";
import { syncStorage } from "./storage";

export class PersistedStore<T> {
  data = $state<T>();
  #storageKey: string;
  #schema: z.ZodSchema;

  constructor({
    storageKey,
    schema,
  }: {
    storageKey: string;
    schema: z.ZodSchema;
  }) {
    this.#storageKey = storageKey;
    this.#schema = schema;
  }

  async persist() {
    return syncStorage.set(this.#storageKey, this.data);
  }

  async restore() {
    const data = await syncStorage.get(this.#storageKey);
    this.data = data ? this.#schema.parse(data) : this.#schema.parse({});
  }
}
