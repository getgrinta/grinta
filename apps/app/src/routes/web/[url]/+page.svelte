<script lang="ts">
  import { page } from "$app/state";

  const url = $derived(decodeURIComponent(page.params.url));
</script>

<iframe src={url}></iframe>
