import { stripe } from "@better-auth/stripe";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP, openAPI } from "better-auth/plugins";
import Stripe from "stripe";
import { db } from "../db/index.js";
import { sendOtp } from "../utils/mail.utils.js";
import { env } from "../utils/env.utils.js";
import { isDisposableEmail } from "../utils/DISPOSABLE_EMAIL_DOMAINS.js";
import { APIError } from 'better-auth/api';

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
				// Check if the email is from a disposable email provider
				if (isDisposableEmail(email)) {
					return Promise.reject(new APIError('FORBIDDEN', {
						message: "Temporary emails are not allowed",
						code: "DISPOSABLE_EMAIL",
					}));
				}

				// Check if the email contains a plus sign in the username part
				if (/^[^+]*\+/.test(email.split('@')[0])) {
					return Promise.reject(new APIError('FORBIDDEN', {
						message: "Plus signs are not allowed in the username part of the email address",
						code: "PLUS_SIGN_NOT_ALLOWED",
					}));
				}

				// Proceed with normal flow
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
