<script lang="ts">
  import { LogInIcon } from "lucide-svelte";
  import { createForm } from "felte";
  import { authClient } from "../lib/auth";
  import { toast } from "svelte-sonner";
  import { match } from "ts-pattern";
  import { navigate } from "astro:transitions/client";
  import { onMount } from "svelte";

  let step = $state<"email" | "code">("email");
  let loading = $state(false);
  let resendRemainingSeconds = $state(60);
  let resendInterval = $state<NodeJS.Timeout | number>();
  const submitLabel = $derived(
    step === "email" ? "Send Verification Code" : "Verify Code",
  );

  function setStep(newStep: "email" | "code") {
    step = newStep;
  }

  const { form, handleSubmit } = createForm({
    async onSubmit(formData) {
      return match(step)
        .with("email", async () => {
          loading = true;
          const { error } = await authClient.emailOtp.sendVerificationOtp({
            email: formData.email,
            type: "sign-in",
          });
          if (error) {
            toast.error(error.message ?? "Error ocurred");
            return;
          }
          loading = false;
          startCountdown();
          setStep("code");
        })
        .with("code", async () => {
          loading = true;
          const { error } = await authClient.signIn.emailOtp({
            email: formData.email,
            otp: formData.code,
          });
          if (error) {
            toast.error(error.message ?? "Error ocurred");
            return;
          }
          loading = false;
          return navigate("/account");
        })
        .exhaustive();
    },
    initialValues: {
      email: "",
      code: "",
    },
  });

  function resendCode() {
    step = "email";
    return handleSubmit();
  }

  function startCountdown() {
    resendRemainingSeconds = 60;
    resendInterval = setInterval(() => {
      resendRemainingSeconds--;
      if (resendRemainingSeconds <= 0) {
        clearInterval(resendInterval);
        resendInterval = 0;
      }
    }, 1000);
  }

  onMount(() => {
    return () => {
      if (resendInterval) {
        clearInterval(resendInterval);
        resendInterval = 0;
      }
    };
  });
</script>

<form use:form class="card w-128 bg-base-100 shadow-sm">
  <div class="card-body items-center justify-center p-12 gap-4">
    <div class="aspect-square border rounded-lg p-2 border-base-300">
      <LogInIcon size={32} />
    </div>
    <h2 class="card-title text-2xl">Sign in with email</h2>
    <p class="max-w-[12rem] text-center">
      Sign in to your account to manage your profile.
    </p>
    <label class="floating-label w-full">
      <span>Your Email</span>
      <input
        type="email"
        name="email"
        placeholder="your@email.com"
        class="input input-lg w-full"
      />
    </label>
    {#if step === "code"}
      <label class="floating-label w-full">
        <span>Verification Code</span>
        <input
          type="text"
          name="code"
          placeholder="123456"
          class="input input-lg w-full"
        />
      </label>
      {#if resendInterval}
        <label class="label"
          >Resend Code in {resendRemainingSeconds} seconds</label
        >
        <progress
          class="progress progress-primary w-full"
          value={resendRemainingSeconds}
          max="60"
        ></progress>
      {/if}
      {#if resendRemainingSeconds === 0}
        <button type="button" class="btn btn-lg w-full" onclick={resendCode}>
          Resend Verification Code
        </button>
      {/if}
    {/if}
    <button
      type="submit"
      class="btn btn-primary btn-lg w-full"
      disabled={loading}>{submitLabel}</button
    >
  </div>
</form>
