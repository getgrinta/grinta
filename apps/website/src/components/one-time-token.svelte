<script lang="ts">
  import { onMount } from "svelte";
  import { authClient } from "../lib/auth";
  import { toast } from "svelte-sonner";

  let code = $state<string>();

  async function copy() {
    await navigator.clipboard.writeText(code);
    toast.success("Copied to clipboard");
  }

  onMount(() => {
    authClient.oneTimeToken.generate().then((response) => {
      code = response.data.token;
    });
  });
</script>

<div class="flex flex-col mt-24 items-center px-4 xl:px-0">
  <div class="card lg:max-w-180 w-full bg-base-100 card-lg shadow-sm">
    <div class="card-body gap-4">
      <h2 class="card-title">One Time Token</h2>
      <button type="button" class="input input-lg w-full" onclick={copy}
        >{code}</button
      >
      <button type="button" class="btn btn-lg btn-primary" onclick={copy}
        >Copy</button
      >
    </div>
  </div>
</div>
