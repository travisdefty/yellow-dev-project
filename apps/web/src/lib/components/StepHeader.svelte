<script lang="ts">
	type Props = { step: number; total: number; title: string };
	let { step, total, title }: Props = $props();
</script>

<div class="mb-6">
	<p class="text-sm font-medium text-muted-foreground">Step {step} of {total}</p>
	<h1 class="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
</div>
