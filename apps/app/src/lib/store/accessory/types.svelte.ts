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
  | null;

export type MapMode = { type: "map"; options: MapModeOptions };
