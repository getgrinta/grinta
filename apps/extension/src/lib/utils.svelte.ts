import type { z } from "zod";
import { syncStorage } from "./storage";
import type { Opener, PageContext } from "./types";
import {
  adjectives,
  animals,
  uniqueNamesGenerator,
} from "unique-names-generator";
import dedent from "dedent";

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

export type TreeNodeTab = {
  tab: chrome.tabs.Tab;
  children: TreeNodeTab[];
};

export function buildTabsTreeFromOpeners(
  tabs: chrome.tabs.Tab[],
  links: Opener[],
): TreeNodeTab[] {
  const tabMap = new Map<number, chrome.tabs.Tab>();
  const nodeMap = new Map<number, TreeNodeTab>();
  const childIds = new Set<number>();

  // Map tab IDs to actual chrome.tabs.Tab objects
  for (const tab of tabs) {
    if (tab.id !== undefined) {
      tabMap.set(tab.id, tab);
    }
  }

  // Create TreeNode instances
  for (const [id, tab] of tabMap.entries()) {
    nodeMap.set(id, { id, tab, children: [] });
  }

  // Build parent-child relationships from links
  for (const { openerId, childId } of links) {
    const parent = nodeMap.get(openerId);
    const child = nodeMap.get(childId);

    if (parent && child) {
      parent.children.push(child);
      childIds.add(childId);
    }
  }

  // Roots = nodes that are never children
  const roots: TreeNodeTab[] = [];
  for (const [id, node] of nodeMap.entries()) {
    if (!childIds.has(id)) {
      roots.push(node);
    }
  }

  return roots;
}

export function generateUsername() {
  return uniqueNamesGenerator({
    dictionaries: [adjectives, animals],
    length: 2,
    separator: " ",
  });
}

export function pageContextToMessage(pageContext: PageContext) {
  return dedent`
    Additional context:
    <page>
    ---
    title: ${pageContext.title}
    url: ${pageContext.url}
    ---
    ${pageContext.content}
    </page>
    Respond with "<context title="${pageContext.title}" url="${pageContext.url}"></context>".
  `;
}
