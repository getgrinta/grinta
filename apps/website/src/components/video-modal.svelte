<script lang="ts">
  import type { Snippet } from "svelte";

  let open = $state(false);
  function toggleModal() {
    open = !open;
  }
  let { id, thumbnailUrl, children } = $props<{
    id: string;
    thumbnailUrl: string;
    children: Snippet;
  }>();

  const element = $derived<HTMLDialogElement>(
    document.getElementById(id) as HTMLDialogElement,
  );
</script>

<button onclick={toggleModal} class="cursor-pointer">
  <img src={thumbnailUrl} class="aspect-video" />
</button>

{#if open}
  <dialog {id} class="modal modal-open">
    <div class="modal-box w-11/12 max-w-4xl p-0">
      {@render children()}
    </div>
    <button class="modal-backdrop" onclick={toggleModal}></button>
  </dialog>
{/if}
