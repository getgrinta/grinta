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

export function rand(items: string[]) {
  return items[(items.length * Math.random()) | 0];
}

export function sortByIdOrder<T extends { id: number }>(
  arr: T[],
  order: number[],
): T[] {
  const orderMap = new Map(order.map((id, index) => [id, index]));
  return [
    // Sorted items that match the order
    ...arr
      .filter((item) => orderMap.has(item.id))
      .sort((a, b) => (orderMap.get(a.id) ?? -1) - (orderMap.get(b.id) ?? -1)),
    // Unsorted leftover items
    ...arr.filter((item) => !orderMap.has(item.id)),
  ];
}
