<script lang="ts">
  import packageJson from "../../../app/package.json";

  let version = $state(packageJson.version);
  const downloadUrlAarch64 = $derived(
    `https://github.com/getgrinta/grinta/releases/download/v${version}/Grinta_${version}_aarch64.dmg`,
  );
  const downloadUrlX64 = $derived(
    `https://github.com/getgrinta/grinta/releases/download/v${version}/Grinta_${version}_x64.dmg`,
  );
</script>

<section
  class="flex flex-col gap-4 justify-center items-center !mt-20 sm:!mt-32 px-4"
>
  <div
    class="flex items-center justify-center gap-2 bg-indigo-500/20 px-3 sm:px-4 py-1 sm:py-2 rounded-full !mb-2 sm:!mb-4 text-sm sm:text-base"
  >
    <span class="font-semibold">Open-source • Privacy-focused • AI-powered</span
    >
  </div>
  <h1
    class="!mt-8 !text-3xl sm:!text-4xl lg:!text-7xl !leading-[2.5rem] sm:!leading-[3rem] lg:!leading-[6rem] text-center max-w-[44rem] !font-semibold"
  >
    Everything you need, in <span
      class="bg-gradient-to-r from-blue-500 to-indigo-400 inline-block text-transparent bg-clip-text"
      >one shortcut</span
    >.
  </h1>
  <p class="text-base sm:text-xl lg:text-2xl text-center max-w-2xl">
    The ultimate macOS productivity tool that combines powerful search,
    AI-assisted notes, and natural language processing - all while respecting
    your privacy.
  </p>
  <div
    class="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center justify-center !mt-6 sm:!mt-8 w-full max-w-md sm:max-w-none"
  >
    <a
      href={downloadUrlAarch64}
      class="btn sm:btn-md lg:btn-lg !bg-zinc-800 border-2 !text-white rounded-full hover:border-primary shadow-2xl hover:shadow-primary/40 w-full sm:w-auto"
    >
      <img
        src="/mac.svg"
        width={30}
        height={30}
        class="text-white hidden sm:inline"
        alt="Mac Icon"
      />
      Download for Apple Silicon
    </a>
    <a
      href={downloadUrlX64}
      class="btn sm:btn-md lg:btn-lg btn-secondary bg-white !text-black rounded-full border-2 border-white hover:bg-primary hover:border-primary hover:!text-white shadow-2xl hover:shadow-primary/40 w-full sm:w-auto"
    >
      <img
        src="/mac_black.svg"
        width={30}
        height={30}
        class="text-black hidden sm:inline"
        alt="Mac Icon"
      />Download for Intel (x64)</a
    >
  </div>
  <div class="flex justify-center mt-3 w-full max-w-md sm:max-w-none">
    <a
      href="/guides"
      class="btn sm:btn-md lg:btn-lg btn-secondary bg-white !text-black rounded-full border-2 border-white hover:bg-primary hover:border-primary hover:!text-white shadow-2xl hover:shadow-primary/40 w-full sm:w-auto"
    >
      Read Docs
    </a>
  </div>
  <div
    class="flex flex-wrap justify-center items-center gap-2 !mt-3 sm:!mt-4 text-xs sm:text-sm lg:text-base text-gray-400"
  >
    <span>✓ Free version</span>
    <span class="hidden sm:inline">•</span>
    <span>✓ No telemetry</span>
    <span class="hidden sm:inline">•</span>
    <span>✓ Local-first</span>
  </div>
</section>
