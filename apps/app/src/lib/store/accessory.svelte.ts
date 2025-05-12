export interface MapModeOptions {
  latitude: number;
  longitude: number;
}

export interface SingleModeOptions {
  text: string;
}

export interface DifferenceModeOptions {
  before: string;
  after: string;
}

export type AccessoryMode =
  | { type: "map"; options: MapModeOptions }
  | { type: "single"; options: SingleModeOptions }
  | { type: "difference"; options: DifferenceModeOptions }
  | null; // null when no accessory view is active

class AccessoryStore {
  mode = $state<AccessoryMode>(null);

  setMode(newMode: AccessoryMode) {
    this.mode = newMode;
    // console.log('Accessory mode set:', this.mode);
  }

  consume(query: string) {
    if (!query || query.trim() === "") {
      this.setMode(null);
      return;
    }

    // Regex to match "latitude,longitude" format
    // Allows for optional spaces around the comma and accepts float/integer numbers.
    const latLonRegex = /^\s*(-?\d{1,2}(\.\d+)?)\s*,\s*(-?\d{1,3}(\.\d+)?)\s*$/;
    const match = query.match(latLonRegex);

    if (match) {
      const latitude = parseFloat(match[1]);
      const longitude = parseFloat(match[3]);

      // Basic validation for latitude and longitude ranges
      if (
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
      ) {
        this.setMode({ type: "map", options: { latitude, longitude } });
      } else {
        // Invalid coordinates, clear mode or handle error
        console.warn("Invalid latitude/longitude values:", query);
        this.setMode(null);
      }
    } else {
      // Query doesn't match any known accessory pattern, clear the mode
      // In the future, other patterns (e.g., for 'difference' or 'single') could be checked here.
      this.setMode(null);
    }
  }

  clearMode() {
    this.setMode(null);
  }
}

export const accessoryStore = new AccessoryStore();
