
export type Feature = "spotlight_search";

export class FeatureFlagStore {
	isFeatureEnabled(_feature: Feature): boolean {
		return true;
	}
}

export const featureFlagStore = new FeatureFlagStore();
