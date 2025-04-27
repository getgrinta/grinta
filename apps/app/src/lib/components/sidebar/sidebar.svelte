<script lang="ts">
  import { _ } from "svelte-i18n";

  let {
    sidebarOpened = $bindable(),
    id,
    children,
    sidebar,
  } = $props<{
    sidebarOpened: boolean;
    id: string;
    children: () => void;
    sidebar: () => void;
  }>();
</script>

<div class="drawer drawer-end">
  <input
    {id}
    type="checkbox"
    class="drawer-toggle"
    bind:checked={sidebarOpened}
  />
  <div class="drawer-content flex flex-col">
    {@render children()}
  </div>
  <div class="drawer-side z-20">
    <label for={id} aria-label={$_("notes.closeSidebar")} class="drawer-overlay"
    ></label>
    <div class="flex bg-base-200 flex-col p-4 h-full w-80">
      {@render sidebar()}
    </div>
  </div>
</div>
