<script lang="ts">
  import type { AccessoryMode } from "$lib/store/accessory.svelte";
  import clsx from "clsx";
  import { LeafletMap, Marker, TileLayer } from "svelte-leafletjs";
  import type { MapOptions } from "leaflet";
  import { onMount } from "svelte";

  const props = $props<{ class?: string; mode: AccessoryMode }>();
  onMount(async () => {
    await import("leaflet/dist/leaflet.css");
  });

  const DEFAULT_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const DEFAULT_TILE_LAYER_OPTIONS = {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  };

  let mapKey = $state(0);
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
    <div class="accessory-view-single h-32">
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <LeafletMap options={mapOptions}>
        <TileLayer
          url={DEFAULT_TILE_URL}
          options={DEFAULT_TILE_LAYER_OPTIONS}
        />
        <Marker latLng={[mapOptions.center[0], mapOptions.center[1]]} />
      </LeafletMap>
    </div>
  {:else if props.mode.type === "single"}
    <div class="accessory-view-multi flex-row">
      <div class="view-item mx-2 justify-items-center align-center">
        {props.mode.options.text}
      </div>
    </div>
  {/if}
</div>

<style>
  .accessory-view-single {
    width: 100%;
  }

  .accessory-view-multi {
    display: flex;
    width: 100%;
    height: 120px;
    align-items: center;
    text-align: center;
  }

  .accessory-view-multi .view-item {
    flex: 1;
    background-color: #e6e6e6;
    border-radius: 12px;
    height: 100px;
    font-size: 20px;
    display: flex;
    align-items: center;
    font-weight: 500;
    justify-content: center;
  }

  .accessory-view-error {
    border: 1px dashed var(--color-error-border, #d92323);
    padding: 0.75rem 1rem;
    border-radius: 0.25rem;
    background-color: var(--color-error-background, #fef2f2);
    color: var(--color-error-text, #b91c1c);
    font-size: 0.875rem;
  }
  .accessory-view-error p {
    margin: 0.25em 0;
  }
  .accessory-view-error code {
    background-color: var(--color-code-background, #fde8e8);
    padding: 0.125rem 0.25rem;
    border-radius: 0.125rem;
  }
</style>
