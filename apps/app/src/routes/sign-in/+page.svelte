<script lang="ts">
  import { goto } from "$app/navigation";
  import { getAuthClient } from "$lib/auth";
  import TopBar from "$lib/components/top-bar.svelte";
  import { appStore } from "$lib/store/app.svelte";
  import { vaultStore } from "$lib/store/vault.svelte";
  import { createForm } from "felte";
  import { toast } from "svelte-sonner";
  import { z } from "zod/v3";
  import { _ } from "$lib/i18n";
  import { onMount } from "svelte";

  const SignInSchema = z.object({
    email: z.string().email(),
  });

  const VerifyOtpSchema = SignInSchema.extend({
    otp: z.string(),
  });

  type Mode = "sendCode" | "verifyOtp";

  let emailField = $state<HTMLInputElement | null>(null);
  let otpField = $state<HTMLInputElement | null>(null);
  let mode = $state<Mode>("sendCode");
  let otpCodeExpiryTime = $state<number | null>(null);
  let progress = $state(0);
  let interactionDisabled = $state(false);

  // Update progress every second when expiryTime is set
  $effect(() => {
    if (!otpCodeExpiryTime) {
      progress = 0;
      return;
    }

    const updateProgress = () => {
      const now = Date.now();
      if (otpCodeExpiryTime === null) {
        progress = 0;
        return;
      }

      const timeLeft = Math.max(0, otpCodeExpiryTime - now);
      const totalDuration = 5 * 60 * 1000;
      progress = (timeLeft / totalDuration) * 100;

      if (timeLeft === 0) {
        otpCodeExpiryTime = null;
        mode = "sendCode";
        interactionDisabled = false;
        progress = 0;
      }
    };

    updateProgress();

    const interval = setInterval(updateProgress, 50);
    return () => clearInterval(interval);
  });

  onMount(() => {
    emailField?.focus();
  });

  const header = $derived(
    mode === "sendCode" ? $_("auth.signIn") : $_("auth.verifyCode"),
  );
  const buttonLabel = $derived(
    mode === "sendCode" ? $_("auth.sendOneTimeCode") : $_("auth.verifyCode"),
  );

  function setMode(newMode: Mode) {
    mode = newMode;
  }

  const { form } = createForm({
    onSubmit: async (values) => {
      const authClient = getAuthClient();
      interactionDisabled = true;

      if (mode === "sendCode") {
        const data = SignInSchema.parse(values);
        const { error } = await authClient.emailOtp.sendVerificationOtp({
          email: data.email,
          type: "sign-in",
        });

        interactionDisabled = false;
        if (error) {
          if (error.message) {
            toast.error(error.message);
          }
          throw error;
        }

        otpCodeExpiryTime = Date.now() + 5 * 60 * 1000;
        setMode("verifyOtp");

        setTimeout(() => {
          otpField?.focus();
        }, 100);
        return;
      }
      const data = VerifyOtpSchema.parse(values);
      const { error } = await authClient.signIn.emailOtp(data, {
        async onSuccess(context) {
          const authCookie = context.response.headers.get("set-cookie");
          if (!authCookie) {
            throw new Error("Auth cookie not found");
          }
          await vaultStore.setAuthCookie(authCookie);
          await appStore.fetchSession();
          return goto("/profile");
        },
      });

      interactionDisabled = false;

      if (error) {
        toast.error($_("auth.invalidCode"));
        throw error;
      }
    },
    onError: (error) => {
      interactionDisabled = false;
      if (error instanceof Error && "issues" in error) {
        const validationObject = JSON.parse(error?.message)[0];

        let errorMessage = validationObject.message;
        if (validationObject.path[0] === "email") {
          errorMessage = $_("auth.invalidEmail");
        }
        return toast.error(errorMessage);
      }
      if (error instanceof Error) {
        return toast.error(error.message);
      }
    },
  });
</script>

<div class="flex flex-1 flex-col">
  <TopBar>
    <h1 slot="input" class="text-lg font-semibold flex-1">{header}</h1>
    <a
      href="https://getgrinta.com/guides"
      slot="addon"
      target="_blank"
      rel="noopener noreferrer"
      class="btn btn-sm">{$_("auth.help")}</a
    >
  </TopBar>
  <div class="flex flex-col flex-1 mt-20 gap-4 items-center justify-center">
    <form use:form class="flex flex-col w-full max-w-[28rem] gap-4">
      <p>{$_("auth.oneTimePasswordInfo")}</p>
      <label for="email" class="label">{$_("auth.email")}</label>
      <input
        bind:this={emailField}
        id="emailField"
        disabled={mode === "verifyOtp" || interactionDisabled}
        placeholder={$_("auth.emailPlaceholder")}
        name="email"
        class="input w-full"
      />
      {#if mode === "verifyOtp"}
        <label for="otpField" class="label">{$_("auth.oneTimeCode")}</label>
        <input
          bind:this={otpField}
          id="otpField"
          name="otp"
          class="input base-content input w-full"
        />
        <div class="flex items-center">
          <progress
            class="m-auto progress accent text-primary-content w-[95%] mt-2"
            value={progress}
            max="100"
          ></progress>
        </div>
      {/if}
      <button type="submit" disabled={interactionDisabled} class="btn"
        >{buttonLabel}</button
      >
    </form>
  </div>
</div>
