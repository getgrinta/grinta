<script lang="ts">
import { appMetadataStore } from "$lib/store/app-metadata.svelte";
import type { ExecutableCommand } from "$lib/store/commands.svelte";
import { getIcon } from "$lib/utils.svelte";
import clsx from "clsx";
import { watch } from "runed";

const {
	item,
	label,
	size = 32,
	active = false,
} = $props<{
	item: ExecutableCommand;
	label: string;
	size?: number;
	active?: boolean;
}>();

const ext = $derived(item.label.split(".").pop() ?? "");
async function loadCommandIcon(command: ExecutableCommand) {
	if (!command.path) return;

	appMetadataStore.getIconAsync(command);
}

watch(
	() => [item.path],
	() => {
		let needsLoading = false;

		if (item.handler === "APP" && !appMetadataStore.appInfo[item.label]) {
			needsLoading = true;
		}

		if (item.handler === "FS_ITEM" && !appMetadataStore.extInfo[ext]) {
			needsLoading = true;
		}

		if (needsLoading) {
			loadCommandIcon(item);
		}
	},
);
</script>

{#if item.metadata?.contentType === "public.folder"}
    <img
        src={appMetadataStore.extInfo["folder"]?.base64Image}
        alt={label}
        width={size}
        height={size}
        class={clsx("object-contain")}
    />
{:else if appMetadataStore.appInfo[item.label]?.base64Image}
    <img
        src={appMetadataStore.appInfo[item.label]?.base64Image}
        alt={label}
        width={size}
        height={size}
        class={clsx("object-contain")}
    />
{:else if appMetadataStore.extInfo[ext]?.base64Image}
    <img
        src={appMetadataStore.extInfo[ext]?.base64Image}
        alt={label}
        width={size}
        height={size}
        class={clsx("object-contain")}
    />
{:else}
    {@const IconComponent = getIcon(item)}
    <div class={clsx("flex items-center justify-center", active && "!text-primary-content")}>
        <IconComponent size={size - 4} />
    </div>
{/if}