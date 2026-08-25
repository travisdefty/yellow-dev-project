<script lang="ts">
	type Props = { id?: string; message?: string };
	let { id, message }: Props = $props();
</script>

<!--
	Renders nothing until there is something to say, so the `aria-describedby` it is pointed at
	resolves to nothing rather than to an empty live region. Phase 2 supplies the messages.
-->
{#if message}
	<p {id} class="mt-1.5 text-sm text-negative" role="alert">{message}</p>
{/if}
