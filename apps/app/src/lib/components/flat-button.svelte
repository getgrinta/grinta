<script lang="ts">
    import { THEME } from "$lib/store/settings.svelte";
    import { SystemThemeWatcher } from "$lib/system-theme-watcher.svelte";
    import clsx from "clsx";

    const { text, onClick, shortcut, showShortcut } = $props<{
        text: string;
        onClick: () => void;
        shortcut?: string;
        showShortcut?: boolean;
    }>();

    const systemThemeWatcher = new SystemThemeWatcher();
</script>

<button
    type="button"
    class={clsx(
        `btn btn-md border-0 bg-base-100`,
        systemThemeWatcher.theme === THEME.LIGHT && "text-neutral-700",
    )}
    onclick={onClick}
>
    <span>{text}</span>
    {#if showShortcut && shortcut}
        <span>{shortcut}</span>
    {/if}
</button>
