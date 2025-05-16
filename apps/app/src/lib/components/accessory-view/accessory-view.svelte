<script lang="ts">
  import type { AccessoryMode } from "$lib/store/accessory/types.svelte";
  import clsx from "clsx";
  import { LeafletMap, Marker, TileLayer } from "svelte-leafletjs";
  import type { MapOptions } from "leaflet";
  import { onMount } from "svelte";
  import { Copy, RefreshCw } from "lucide-svelte"; // Import icons
  import clipboard from "clipboardy"; // Import clipboardy
  import { accessoryStore } from "$lib/store/accessory.svelte"; // Import store for refresh
  import { appStore } from "$lib/store/app.svelte"; // Import appStore for query
  import { toast } from "svelte-sonner";
  import { t } from "svelte-i18n"; // Import translation function

  const props = $props<{
    class?: string;
    mode: AccessoryMode;
    isCopyable?: boolean;
    isRefreshable?: boolean;
  }>();
  onMount(async () => {
    await import("leaflet/dist/leaflet.css");
  });

  const DEFAULT_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const DEFAULT_TILE_LAYER_OPTIONS = {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  };

  let mapOptions = $derived.by<MapOptions | null>(() => {
    if (props.mode.type === "map") {
      return {
        center: [props.mode.options.latitude, props.mode.options.longitude],
        zoom: 11,
        scrollWheelZoom: false,
      };
    }
    return null;
  });

  async function copyText() {
    try {
      await clipboard.write(props.mode.options.text);
      toast.success($t("accessory.copied"));
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  }

  function refreshText() {
    accessoryStore.consume(appStore.query);
  }
</script>

<div class={clsx(props.class)}>
  {#if props.mode.type === "difference"}
    <div class="accessory-view-multi flex-row">
      <div class="view-item mx-2 justify-items-center align-center">
        {props.mode.options.before}
      </div>
      <div class="view-item mx-2 justify-items-center align-center">
        {props.mode.options.after}
      </div>
    </div>
  {:else if props.mode.type === "map" && mapOptions && mapOptions.center}
    {#key mapOptions.center}
      <div class="flex w-full h-[320px]">
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <LeafletMap options={mapOptions}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker latLng={[mapOptions.center[0], mapOptions.center[1]]} />
        </LeafletMap>
      </div>
    {/key}
  {:else if props.mode?.type === "single"}
    <div class="relative p-2 flex w-full h-[120px] items-center text-center">
      <div
        class="view-item mx-2 justify-items-center align-center flex-1 bg-[#e6e6e6] dark:bg-gray-700 rounded-xl h-[100px] text-xl flex border-2 border-[#ddd] dark:border-gray-600 items-center font-medium justify-center"
      >
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <span
          class="block cursor-pointer truncate"
          onclick={copyText}
          title="Click to copy"
        >
          {props.mode.options.text}
        </span>

        <div class="absolute bottom-3 right-6 space-x-1">
          {#if props.isCopyable}
            <button
              onclick={copyText}
              class="p-1 cursor-pointer rounded hover:bg-gray-200 dark:hover:bg-gray-700"
              title={"Copy"}
            >
              <Copy class="w-4 h-4" color="#666" />
            </button>
          {/if}
          {#if props.isRefreshable}
            <button
              onclick={refreshText}
              class="p-1 cursor-pointer rounded hover:bg-gray-200 dark:hover:bg-gray-700"
              title="Refresh"
            >
              <RefreshCw class="w-4 h-4" color="#666" />
            </button>
          {/if}
        </div>
      </div>
    </div>
  {:else}
    <!-- Empty or unknown mode -->
  {/if}
</div>
