<script lang="ts">
  import { authClient } from "$lib/auth";
  import Layout from "$lib/components/layout.svelte";
  import ViewTitle from "$lib/components/view-title.svelte";
  import { useRsv } from "@ryuz/rsv";
  import { createForm } from "felte";
  import { toast } from "svelte-sonner";

  const router = useRsv();

  let loading = $state(false);

  const { form } = createForm({
    async onSubmit(formData) {
      loading = true;
      const { error } = await authClient.oneTimeToken.verify({
        token: formData.code,
      });
      if (error) {
        toast.error(error.message ?? "Error ocurred");
        return;
      }
      loading = false;
      router?.navigate("/chats/");
    },
    initialValues: {
      code: "",
    },
  });
</script>

<Layout>
  <ViewTitle title="Sign In" />
  <div class="flex-1 flex flex-col items-center justify-center gap-8 p-2">
    <div class="flex flex-col gap-4 w-full">
      <h2 class="text-lg font-semibold">1. Get One Time Token</h2>
      <p>Sign in to your account to start using GrintAI.</p>
      <a
        href="https://getgrinta.com/code"
        target="_blank"
        rel="noopener noreferrer"
        class="btn w-full">Get One Time Token</a
      >
    </div>
    <form use:form class="flex flex-col gap-2 w-full">
      <h2 class="text-lg font-semibold">2. Verify One Time Token</h2>
      <label for="code" class="label">One Time Token</label>
      <input
        id="code"
        type="text"
        name="code"
        class="input w-full"
        placeholder="Enter your one time token"
      />
      <button class="btn btn-primary" disabled={loading}>Verify Token</button>
    </form>
  </div>
</Layout>
