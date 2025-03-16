
export type Feature = "spotlight_search";

export class FeatureFlagStore {
	isFeatureEnabled(_feature: Feature): boolean {
		return true;
		//  match(feature)
		// 	.with("spotlight_search", () => true)
		// 	.exhaustive();
	}
}

export const featureFlagStore = new FeatureFlagStore();
