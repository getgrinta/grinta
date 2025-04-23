<script lang="ts">
  import clsx from "clsx";
  import { PressedKeys } from "runed";

  const pressedKeys = new PressedKeys();
  const isCmdPressed = $derived(pressedKeys.has("Meta"));

  type Item = {
    text?: string;
    onClick: () => void;
    active?: boolean;
    hotkey?: string;
    shortcut?: string;
    testId?: string;
    icon?: any;
    class?: string;
  };

  const {
    items,
    alwaysShowLabels = false,
    showLabelOnHover = false,
  } = $props<{
    items: Item[];
    alwaysShowLabels?: boolean;
    showLabelOnHover?: boolean;
  }>();
</script>

<div class={clsx("join shadow-sm rounded-full border-0 ring-0")}>
  {#each items as item}
    <div
      class={clsx(
        "tooltip-primary tooltip-bottom",
        !alwaysShowLabels && "tooltip",
      )}
      data-tip={item.text}
    >
      <button
        type="button"
        class={clsx(
          "btn btn-sm join-item py-4 px-3 group",
          item.active && "btn-primary",
          item.class,
        )}
        onclick={item.onClick}
        data-testid={item.testId}
      >
        {#if item.icon}
          <item.icon size={16} />
        {/if}
        {#if alwaysShowLabels || showLabelOnHover}
          <span
            class={clsx(
              "transition",
              showLabelOnHover && "group-hover:block hidden overflow-hidden",
            )}>{item.text}</span
          >
        {/if}
        {#if item.shortcut && isCmdPressed}
          <span>{item.shortcut}</span>
        {/if}
      </button>
    </div>
  {/each}
</div>
