<script lang="ts">
  import { ContextMenu } from "bits-ui";
  import { XIcon } from "lucide-svelte";
  import { type Snippet } from "svelte";
  import { sendMessage } from "webext-bridge/popup";

  type Props = ContextMenu.RootProps & {
    children: Snippet;
    index: number;
  };

  let { open = $bindable(false), index, children }: Props = $props();

  function handleRemove() {
    // sendMessage("grinta_removeEssential", { tabId }, "background");
    open = false;
  }
</script>

<ContextMenu.Root bind:open>
  <ContextMenu.Trigger class="w-full flex">
    {@render children()}
  </ContextMenu.Trigger>
  <ContextMenu.Portal>
    <ContextMenu.Content>
      <ul class="menu menu-sm bg-base-200 rounded-box w-56">
        <li>
          <button onclick={handleRemove}>
            <XIcon size={16} />
            <span>Remove Essential</span>
          </button>
        </li>
      </ul>
    </ContextMenu.Content>
  </ContextMenu.Portal>
</ContextMenu.Root>
