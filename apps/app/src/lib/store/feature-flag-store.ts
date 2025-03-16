import { match } from "ts-pattern";

export type Feature = "spotlight_search";

export class FeatureFlagStore {
	isFeatureEnabled(feature: Feature): boolean {
		return match(feature)
			.with("spotlight_search", () => true)
			.exhaustive();
	}
}

export const featureFlagStore = new FeatureFlagStore();
