<script lang="ts">
  const { title, action, addon } = $props<{
    title: string;
    action?: () => void;
    addon?: () => void;
  }>();
</script>

<div
  class="flex gap-2 items-center border-b bg-base-100 border-base-content/5 p-2"
>
  {@render action?.()}
  <h1 class="text-lg flex-1 font-semibold">{title}</h1>
  <div class="flex items-center">
    {@render addon?.()}
  </div>
</div>
