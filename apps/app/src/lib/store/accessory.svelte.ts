export class AccessoryStore {
  mode = $state<AccessoryMode | null>(null);

  setMode(mode: AccessoryMode) {
    this.mode = mode;
  }
}

export interface AccessoryOptionDifference {
  before: string;
  after: string;
}

export interface AccessoryOptionMap {
  latitude: number;
  longitude: number;
}

export interface AccessoryOptionSingle {
  text: string;
}

export interface AccessoryMode {
  type: "difference" | "map" | "single";
  options:
    | AccessoryOptionDifference
    | AccessoryOptionMap
    | AccessoryOptionSingle;
}

export const accessoryStore = new AccessoryStore();
