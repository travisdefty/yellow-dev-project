<script lang="ts">
	import type { PhoneItem } from '$lib/catalogue';
	import { formatCents, formatCentsExact } from '$lib/format';
	import DeviceSilhouette from '$lib/devices/DeviceSilhouette.svelte';
	import { tintForBrand } from '$lib/devices/brand-tint';
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';

	type Props = { phone: PhoneItem };
	let { phone }: Props = $props();
</script>

<Card class="gap-4 rounded-lg px-4">
	<div class="flex items-start gap-4">
		<DeviceSilhouette tint={tintForBrand(phone.brand)} class="h-16 w-10 shrink-0" />

		<div class="min-w-0 flex-1">
			<!--
				The daily instalment is the hero. No monthly figure: monthly income feeds the
				affordability rule, and is never quoted back as a price.
			-->
			<p class="text-2xl leading-none font-semibold">
				{formatCentsExact(phone.dailyCents)}<span
					class="text-sm font-normal text-muted-foreground"> / day</span
				>
			</p>
			<p class="mt-2 truncate text-sm font-medium">{phone.brand} {phone.model}</p>
			<p class="truncate text-sm text-muted-foreground">
				{phone.storageGb} GB · {phone.colour}
			</p>
		</div>
	</div>

	<dl class="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
		<dt class="text-muted-foreground">Cash price</dt>
		<dd class="text-right text-muted-foreground">{formatCents(phone.cashPriceCents)}</dd>
		<dt class="text-muted-foreground">Deposit today</dt>
		<dd class="text-right">{formatCents(phone.depositCents)}</dd>
	</dl>

	<Separator />

	<dl class="grid grid-cols-2 gap-x-3 text-sm">
		<dt class="text-muted-foreground">Total repayable</dt>
		<dd class="text-right font-medium">{formatCents(phone.loanAmountCents)}</dd>
	</dl>

	<Button size="pill" href="/apply/review" class="w-full">Select this phone</Button>
</Card>
