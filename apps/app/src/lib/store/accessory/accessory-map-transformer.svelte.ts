import type { AccessoryTransformer } from "../accessory.svelte";
import type { MapMode } from "./types.svelte";

export class AccessoryMapTransformer implements AccessoryTransformer {
  private readonly latLonRegex =
    /^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

  transform(query: string): MapMode | null {
    const match = query.match(this.latLonRegex);
    if (match) {
      const latitude = parseFloat(match[1]);
      const longitude = parseFloat(match[2]);
      if (
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
      ) {
        return { type: "map", options: { latitude, longitude } };
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  get canCopy() {
    return false;
  }

  get canRefresh() {
    return false;
  }
}
