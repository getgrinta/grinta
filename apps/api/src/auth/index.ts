import { stripe } from "@better-auth/stripe";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP, openAPI } from "better-auth/plugins";
import Stripe from "stripe";
import { db } from "../db";
import { env } from "../utils/env.utils";
import { sendOtp } from "../utils/mail.utils";

const stripeClient = new Stripe(env.STRIPE_SECRET_KEY);

export const auth = betterAuth({
	trustedOrigins: ["*"],
	database: drizzleAdapter(db, {
		provider: "pg",
	}),
	plugins: [
		emailOTP({
			async sendVerificationOTP({ email, otp }) {
				await sendOtp({ to: email, code: otp });
			},
		}),
		stripe({
			stripeClient,
			stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
			createCustomerOnSignUp: true,
			subscription: {
				enabled: true,
				plans: [
					{
						name: "pro",
						priceId: env.STRIPE_PRICE_ID,
						freeTrial: {
							days: 7,
						},
					},
				],
			},
		}),
		openAPI(),
	],
});
