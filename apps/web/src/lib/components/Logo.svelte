<script lang="ts">
	type Props = { size?: number; class?: string };
	let { size = 40, class: className }: Props = $props();
</script>

<!--
	Inline rather than an <img>: the whole mark is two paths on a tile, so it costs no request, no
	decode and no layout shift, and it stays crisp at every device pixel ratio. A raster of the same
	mark is 7.8KB and a round trip.
-->
<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 40 40"
	width={size}
	height={size}
	class={className}
	role="img"
	aria-label="Yellow"
>
	<rect width="40" height="40" rx="8" fill="var(--accent)" />
	<g fill="none" stroke="var(--foreground)" stroke-width="2.2" stroke-linecap="round">
		<path d="M15.5 10.5v7a4.5 4.5 0 0 0 9 0v-7" />
		<path d="M20 22v7.5" />
	</g>
</svg>
