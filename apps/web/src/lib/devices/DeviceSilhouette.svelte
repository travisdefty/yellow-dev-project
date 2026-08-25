<script lang="ts">
	type Props = { tint: string; class?: string };
	let { tint, class: className }: Props = $props();
</script>

<!--
	One outline, reused for every device and tinted per brand. Twelve devices would otherwise be
	twelve licensed photographs, twelve requests and twelve chances to shift the layout; this is a
	handful of bytes inside the HTML that already had to be sent. The card's job is the price.
-->
<svg
	viewBox="0 0 64 100"
	class={className}
	fill="none"
	stroke={tint}
	stroke-width="3"
	aria-hidden="true"
>
	<rect x="4" y="2" width="56" height="96" rx="10" />
	<line x1="4" y1="16" x2="60" y2="16" stroke-width="1.5" opacity="0.5" />
	<line x1="4" y1="86" x2="60" y2="86" stroke-width="1.5" opacity="0.5" />
	<circle cx="32" cy="92" r="2.5" fill={tint} stroke="none" />
</svg>
