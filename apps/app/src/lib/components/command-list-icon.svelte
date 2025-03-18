<script lang="ts">
    import { type AppMetadataStore } from "$lib/store/app-metadata.svelte";
    import type { ExecutableCommand } from "$lib/store/commands.svelte";
    import { getIcon } from "$lib/utils.svelte";
    import { watch } from "runed";

    const props: {
        item: ExecutableCommand;
        appMetadataStore: AppMetadataStore;
        label: string;
    } = $props();

    const ext = $derived(props.item.label.split(".").pop() ?? "");
    function loadCommandIcon(command: ExecutableCommand) {
        if (!command.path) return;

        props.appMetadataStore.getIconAsync(command);
    }

    watch(
        () => [props.item.path],
        () => {
            let needsLoading = false;

            if (
                props.item.handler === "APP" &&
                !props.appMetadataStore.appInfo[props.item.label]
            ) {
                needsLoading = true;
            }

            if (
                props.item.handler === "FS_ITEM" &&
                !props.appMetadataStore.extInfo[props.item.label]
            ) {
                needsLoading = true;
            }

            if (needsLoading) {
                loadCommandIcon(props.item);
            }
        },
    );
</script>

{#if props.item.metadata?.contentType === "public.folder"}
    <img
        src={props.appMetadataStore.extInfo["folder"].base64Image}
        alt={props.label}
        width="32"
        height="32"
        class="w-8 h-8 object-contain"
    />
{:else if props.appMetadataStore.appInfo[props.item.label]}
    <img
        src={props.appMetadataStore.appInfo[props.item.label].base64Image}
        alt={props.label}
        width="32"
        height="32"
        class="w-8 h-8 object-contain"
    />
{:else if props.appMetadataStore.extInfo[ext]}
    <img
        src={props.appMetadataStore.extInfo[ext].base64Image}
        alt={props.label}
        width="32"
        height="32"
        class="w-8 h-8 object-contain"
    />
{:else}
    {@const IconComponent = getIcon(props.item)}
    <div class="flex items-center justify-center w-8 h-8">
        <IconComponent size={24} />
    </div>
{/if}