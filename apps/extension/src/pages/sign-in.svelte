<script lang="ts">
  import { authClient } from "$lib/auth";
  import Layout from "$lib/components/layout.svelte";
  import { useRsv } from "@ryuz/rsv";
  import { createForm } from "felte";
  import { toast } from "svelte-sonner";
  import { match } from "ts-pattern";

  const router = useRsv();

  let step = $state<"email" | "code">("email");
  const submitLabel = $derived(
    step === "email" ? "Send Verification Code" : "Verify Code",
  );

  function setStep(newStep: "email" | "code") {
    step = newStep;
  }

  const { form } = createForm({
    async onSubmit(formData) {
      return match(step)
        .with("email", async () => {
          const { data, error } = await authClient.emailOtp.sendVerificationOtp(
            {
              email: formData.email,
              type: "sign-in",
            },
          );
          if (error) {
            toast.error(error.message ?? "Error ocurred");
            return;
          }
          setStep("code");
        })
        .with("code", async () => {
          const { data, error } = await authClient.signIn.emailOtp({
            email: formData.email,
            otp: formData.code,
          });
          if (error) {
            toast.error(error.message ?? "Error ocurred");
            return;
          }
          router?.navigate("/agent");
        })
        .exhaustive();
    },
    initialValues: {
      email: "",
      code: "",
    },
  });
</script>

<Layout>
  <div class="flex-1 flex flex-col items-center justify-center gap-2">
    <form use:form class="flex flex-col gap-2 w-full">
      <h1 class="text-lg font-semibold">Sign In</h1>
      <label for="email" class="label">Email Address</label>
      <input
        id="email"
        type="email"
        name="email"
        class="input w-full"
        placeholder="your@email.com"
      />
      {#if step === "code"}
        <label for="code" class="label">Verification Code</label>
        <input
          id="code"
          type="text"
          name="code"
          class="input w-full"
          placeholder="123456"
        />
      {/if}
      <button class="btn btn-primary">{submitLabel}</button>
    </form>
  </div>
</Layout>
