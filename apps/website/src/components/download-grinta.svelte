<script lang="ts">
  import { onMount } from "svelte";

  onMount(() => {
    if (typeof window === "undefined") return;
    const searchParams = new URLSearchParams(window.location.search);
    const fetchSession = searchParams.get("fetchSession");
    if (fetchSession) {
      setTimeout(() => {
        window.grinta.fetchSession();
      }, 1000);
    }
  });
</script>

<section
  id="downloadGrinta"
  class="container px-4 xl:px-0 max-w-[80rem] grid grid-cols-1 lg:grid-cols-2 mx-auto mt-32 rounded-[2rem] scroll-mt-24 gap-16"
>
  <div class="flex flex-col justify-center gap-8">
    <img src="/download.png" alt="Grinta Download" class="w-16 h-16" />
    <h2 class="font-[Cal_Sans] text-5xl">Download Grinta<br />for macOS</h2>
    <div class="flex flex-col gap-4">
      <a
        class="btn btn-primary btn-xl"
        href="https://grnt.me/grinta_silicon"
        rel="noopener noreferrer"
        target="_blank">Download for Apple Silicon</a
      >
      <a
        class="btn btn-ghost btn-xl"
        href="https://grnt.me/grinta_intel"
        rel="noopener noreferrer"
        target="_blank">Download for Intel</a
      >
    </div>
  </div>
  <img src="/grinta_1.jpg" alt="Grinta" class="rounded-[2rem]" />
</section>
