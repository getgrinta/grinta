<script lang="ts">
const {
	children,
	for: labelFor,
	hotkey,
} = $props<{
	for: string;
	hotkey?: string;
}>();
</script>

<label 
    for={labelFor}
    class="btn btn-sm shadow-neutral-400/30 shadow-xs border-neutral-400/30 bg-neutral-200/50" 
    data-hotkey={hotkey}
>
    {@render children?.()}
</label>
