import { z } from "zod";

export const subscriptionSchema = z.object({
	id: z.string(),
	plan: z.string(),
	stripeCustomerId: z.string().optional(),
	stripeSubscriptionId: z.string().optional(),
	trialStart: z.date().optional(),
	trialEnd: z.date().optional(),
	priceId: z.string().optional(),
	referenceId: z.string().default("- userId"),
	status: z.union([
		z.literal("active"),
		z.literal("canceled"),
		z.literal("incomplete"),
		z.literal("incomplete_expired"),
		z.literal("past_due"),
		z.literal("paused"),
		z.literal("trialing"),
		z.literal("unpaid"),
	]),
	periodStart: z.string().optional(),
	periodEnd: z.string().optional(),
	cancelAtPeriodEnd: z.boolean().nullish(),
	groupId: z.string().optional(),
	seats: z.number().optional(),
});

export const sanitizedSubscriptionSchema = z.object({
	plan: z.string(),
	status: z.union([z.literal("active"), z.literal("trialing")]),
	periodEnd: z.string(),
});

export type Subscription = z.infer<typeof subscriptionSchema>;
export type SanitizedSubscription = z.infer<typeof sanitizedSubscriptionSchema>;
