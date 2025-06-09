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
    <label
      for={id}
      aria-label={$_("notes.closeSidebar")}
      class="drawer-overlay !bg-base-200/50"
    ></label>
    <div
      class="flex bg-base-100 backdrop-blur-lg flex-col p-4 m-2 h-[calc(100%-1rem)] rounded-xl w-80 border border-base-content/10"
    >
      {@render sidebar()}
    </div>
  </div>
</div>
