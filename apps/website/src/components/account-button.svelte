<script lang="ts">
  import { CircleUserIcon } from "lucide-svelte";

  const { userId } = $props<{ userId?: string }>();
</script>

<a href="/sign-in" class="avatar">
  {#if userId}
    <div class="w-8 h-8 rounded-full">
      <img
        src={`https://meshy.studio/api/mesh/${userId}?noise=8&sharpen=1&negate=false&gammaIn=2.1&gammaOut=2.2&brightness=100&saturation=100&hue=0&lightness=0&blur=0`}
        alt="Avatar"
      />
    </div>
  {:else}
    <a href="/sign-in" class="btn btn-square rounded-full btn-ghost">
      <CircleUserIcon size={20} aria-label="Sign In" />
    </a>
  {/if}
</a>
