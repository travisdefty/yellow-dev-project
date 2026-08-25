<script lang="ts">
	import './layout.css';
	import type { Snippet } from 'svelte';
	import Logo from '$lib/components/Logo.svelte';
	import { Toaster } from '$lib/components/ui/sonner';

	let { children }: { children: Snippet } = $props();
</script>

<!-- One column, capped, generous side padding. Every screen in the flow is a phone screen first. -->
<div class="mx-auto min-h-screen max-w-2xl px-4 py-8">
	<header class="mb-8 flex items-center gap-3">
		<a href="/" class="flex items-center gap-3 rounded-lg">
			<Logo size={36} />
			<span class="text-lg font-semibold tracking-tight">Yellow</span>
		</a>
	</header>

	{@render children()}
</div>

<Toaster />
