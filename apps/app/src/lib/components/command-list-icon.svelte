<script lang="ts">
  import { appMetadataStore } from "$lib/store/app-metadata.svelte";
  import { getIcon } from "$lib/utils.svelte";
  import clsx from "clsx";
  import { watch } from "runed";
  import { fetchFavicon } from "$lib/grinta-invoke";
  import type { ExecutableCommand } from "@getgrinta/core";

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

  function normalizeUrlForFavicon(url: URL): string {
    const hostname = url.hostname;
    return `https://${hostname.startsWith("www.") ? "" : "www."}${hostname}`;
  }

  async function loadCommandIcon(command: ExecutableCommand) {
    if (!command.metadata?.path) return;

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

      if (item.handler === "URL") {
        try {
          const url = new URL(item.value);
          const normalizedUrl = normalizeUrlForFavicon(url);

          if (!appMetadataStore.favIcons[normalizedUrl]) {
            fetchFavicon(normalizedUrl)
              .then((faviconUrl) => {
                if (faviconUrl) {
                  appMetadataStore.favIcons[normalizedUrl] = faviconUrl;
                }
              })
              .catch((error) => {
                console.error(
                  `Failed to fetch favicon for ${item.value}:`,
                  error,
                );
              });
          }
        } catch (error) {
          /* Failed to parse url for icon */
        }
      }

      if (needsLoading) {
        loadCommandIcon(item);
      }
    },
  );

  const faviconBaseValue = $derived.by(() => {
    try {
      const url = new URL(item.value);
      return normalizeUrlForFavicon(url);
    } catch (error) {
      /* Failed to parse url for icon */
      return "";
    }
  });
</script>

{#if item.metadata?.contentType === "public.folder"}
  <img
    src={appMetadataStore.extInfo["folder"]?.base64Image}
    alt={label}
    width={size}
    height={size}
    class={clsx("object-contain")}
  />
{:else if item.handler === "URL" && appMetadataStore.favIcons[faviconBaseValue]}
  <img
    src={appMetadataStore.favIcons[faviconBaseValue]}
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
  <div
    class={clsx(
      "flex items-center justify-center",
      active && "!text-primary-content",
    )}
  >
    <IconComponent size={size - 4} />
  </div>
{/if}
