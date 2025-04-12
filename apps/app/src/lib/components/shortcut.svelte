<script lang="ts">
  import { PressedKeys } from "runed";

  let { keys, callback } = $props<{ keys: string[]; callback: () => void }>();

  const pressedKeys = new PressedKeys();

  const areKeysPressed = $derived(pressedKeys.has(...keys));

  $effect(() => {
    if (!areKeysPressed) return;
    callback();
  });
</script>
