import { stripe } from "@better-auth/stripe";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP, openAPI } from "better-auth/plugins";
import Stripe from "stripe";
import { db } from "../db/index.js";
import { env } from "../utils/env.utils.js";
import { sendOtp } from "../utils/mail.utils.js";

const stripeClient = new Stripe(env.STRIPE_SECRET_KEY);

export const auth = betterAuth({
	basePath: "/api/auth",
	trustedOrigins: ["*"],
	database: drizzleAdapter(db, {
		provider: "pg",
	}),
	session: {
		freshAge: 0,
	},
	plugins: [
		emailOTP({
			async sendVerificationOTP({ email, otp }) {
				await sendOtp({ to: email, code: otp });
			},
		}),
		// @ts-expect-error
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
