import { AccessoryMapTransformer } from "./accessory/accessory-map-transformer.svelte";
import { AccessoryUuidTransformer } from "./accessory/accessory-uuid-transformer.svelte";
import type { AccessoryMode } from "./accessory/types.svelte";

export interface AccessoryTransformer {
  transform(query: string): AccessoryMode | null;
  canCopy: boolean;
  canRefresh: boolean;
}

export class AccessoryStore {
  mode = $state<AccessoryMode>(null);
  isRefreshable = $state(false);
  isCopyable = $state(false);

  private transformers: AccessoryTransformer[];

  constructor() {
    this.transformers = [
      new AccessoryUuidTransformer(),
      new AccessoryMapTransformer(),
    ];
  }

  setMode(newMode: AccessoryMode) {
    this.mode = newMode;
  }

  consume(query: string) {
    if (!query || query.trim() === "") {
      this.clearMode();
      return;
    }

    let didSet = false;

    for (const transformer of this.transformers) {
      const mode = transformer.transform(query);
      if (mode) {
        this.setMode(mode);
        this.isCopyable = transformer.canCopy;
        this.isRefreshable = transformer.canRefresh;
        didSet = true;
        break;
      }
    }

    if (!didSet) {
      this.clearMode();
    }
  }

  clearMode() {
    this.setMode(null);
  }
}

export const accessoryStore = new AccessoryStore();
