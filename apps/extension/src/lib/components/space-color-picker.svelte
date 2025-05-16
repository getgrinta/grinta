<script lang="ts">
  import { CircleIcon } from "lucide-svelte";
  import colors from "tailwindcss/colors";
  import { sendMessage } from "webext-bridge/popup";

  let { space } = $props<{
    space: chrome.tabGroups.TabGroup;
  }>();

  const hex = $derived(colors[space.color as never]?.[500] ?? colors.gray[500]);

  function updateGroupColor(groupId: number, color: chrome.tabGroups.Color) {
    return sendMessage(
      "grinta_updateGroup",
      { groupId, color, title: space.title },
      "background",
    );
  }
</script>

<div class="dropdown">
  <div tabindex="0" role="button" class="btn btn-sm btn-square">
    <CircleIcon size={20} color={hex} />
  </div>
  <ul
    tabindex="0"
    class="dropdown-content flex gap-1 bg-base-100 rounded-box z-1 w-84 p-2 shadow-sm"
  >
    {#each Object.values(chrome.tabGroups.Color) as color}
      <li>
        <button
          type="button"
          class="btn btn-square btn-sm"
          onclick={() => updateGroupColor(space.id, color)}
          ><CircleIcon
            size={20}
            color={colors[color as never]?.[500] ?? colors.gray[500]}
          /></button
        >
      </li>
    {/each}
  </ul>
</div>
