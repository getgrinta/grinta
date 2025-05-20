<script lang="ts">
  import { MoonIcon, SunIcon } from "lucide-svelte";

  let theme = $state(localStorage.getItem("starlight-theme"));
  const toggled = $derived(theme === "dark");
  function toggleTheme() {
    const newTheme = theme === "dark" ? "light" : "dark";
    localStorage.setItem("starlight-theme", newTheme);
    theme = newTheme;
    document.documentElement.setAttribute("data-theme", newTheme);
  }
</script>

<label class="swap swap-rotate">
  <!-- this hidden checkbox controls the state -->
  <input
    type="checkbox"
    class="theme"
    checked={toggled}
    onchange={toggleTheme}
  />
  <!-- sun icon -->
  <SunIcon class="swap-off" />
  <!-- moon icon -->
  <MoonIcon class="swap-on" />
</label>
