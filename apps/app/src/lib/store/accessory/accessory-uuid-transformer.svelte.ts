import { uuidv7 } from "uuidv7";
import type { AccessoryMode } from "./types.svelte";
import type { AccessoryTransformer } from "../accessory.svelte"; // Import the interface

export class AccessoryUuidTransformer implements AccessoryTransformer {
  transform(query: string): AccessoryMode | null {
    if (query.toLowerCase() === "uuid") {
      const newUuid = uuidv7();
      return { type: "single", options: { text: newUuid } };
    }
    return null;
  }

  get canCopy() {
    return true;
  }

  get canRefresh() {
    return true;
  }
}
