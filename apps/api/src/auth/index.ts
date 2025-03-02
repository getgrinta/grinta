import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP, openAPI } from "better-auth/plugins";
import { db } from "../db";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
	}),
	plugins: [
		emailOTP({
			async sendVerificationOTP({ email, otp, type }) {
				console.log(">>>OTP", email, otp, type);
			},
		}),
		openAPI(),
	],
});
