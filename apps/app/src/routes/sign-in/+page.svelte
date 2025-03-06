<script lang="ts">
import { goto } from "$app/navigation";
import { getAuthClient } from "$lib/auth";
import TopBar from "$lib/components/top-bar.svelte";
import { appStore } from "$lib/store/app.svelte";
import { vaultStore } from "$lib/store/vault.svelte";
import { createForm } from "felte";
import { toast } from "svelte-sonner";
import { ZodError, z } from "zod";

const SignInSchema = z.object({
	email: z.string().email(),
});

const VerifyOtpSchema = SignInSchema.extend({
	otp: z.string(),
});

type Mode = "sendCode" | "verifyOtp";

let mode = $state<Mode>("sendCode");
const header = $derived(mode === "sendCode" ? "Send Code" : "Verify Code");
const buttonLabel = $derived(mode === "sendCode" ? "Sign In" : "Verify Code");

function setMode(newMode: Mode) {
	mode = newMode;
}

const { form } = createForm({
	onSubmit: async (values) => {
		const authClient = getAuthClient();
		if (mode === "sendCode") {
			const data = SignInSchema.parse(values);
			const { error } = await authClient.emailOtp.sendVerificationOtp({
				email: data.email,
				type: "sign-in",
			});
			if (error) {
				throw error;
			}
			return setMode("verifyOtp");
		}
		const data = VerifyOtpSchema.parse(values);
		const { error } = await authClient.signIn.emailOtp(data, {
			async onSuccess(context) {
				const authCookie = context.response.headers.get("set-cookie");
				if (!authCookie) {
					throw new Error("Auth cookie not found");
				}
				console.log(authCookie);
				await vaultStore.setAuthCookie(authCookie);
				await appStore.setSession();
				console.log("Auth cookie saved");
				return goto("/profile");
			},
		});
		if (error) {
			throw error;
		}
	},
	onError: (error) => {
		if (error instanceof ZodError) {
			const errorMessage = JSON.parse(error?.message)[0].message;
			return toast.error(errorMessage);
		}
		if (error instanceof Error) {
			return toast.error(error.message);
		}
	},
});
</script>

<div class="flex flex-1 flex-col">
    <TopBar />
    <div class="flex flex-col flex-1 mt-12 gap-4 items-center justify-center">
        <form use:form class="flex flex-col w-full max-w-[28rem] gap-2">
            <h1 class="col-span-2 text-2xl font-semibold">{header}</h1>
            <label for="emailField" class="label">Email Address</label>
            <input id="emailField" name="email" class="input input-lg w-full" />
            {#if mode === 'verifyOtp'}
                <label for="otpField" class="label">OTP</label>
                <input id="otpField" name="otp" class="input input-lg w-full" />
            {/if}
            <button type="submit" class="btn btn-lg">{buttonLabel}</button>
        </form>
    </div>
</div>
