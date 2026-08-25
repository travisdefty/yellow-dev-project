<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import FieldError from '$lib/components/FieldError.svelte';
	import FileUpIcon from '@lucide/svelte/icons/file-up';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import XIcon from '@lucide/svelte/icons/x';
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { validatedSubmit } from '$lib/forms';
	import { incomeSchema, parseRandsToCents } from '@yellow/domain';
	import type { Parser } from '$lib/field-errors';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const INCOME_ERROR = 'Enter an amount, for example R 12 500.';

	// The form's field is called 'income' and speaks plain rands as typed; the schema's field is
	// called 'monthlyIncomeCents' and speaks integer cents. This adapter bridges the two so the same
	// wording and the same acceptance rule apply whether or not JS ran, without the schema itself
	// needing to know about the form's naming.
	const incomeForm: Parser<{ income: string }> = {
		safeParse: (value) => {
			const income = (value as { income: string }).income;
			const cents = parseRandsToCents(income);
			const failed = cents === null || !incomeSchema.safeParse({ monthlyIncomeCents: cents }).success;
			return failed
				? { success: false, error: { issues: [{ path: ['income'], message: INCOME_ERROR }] } }
				: { success: true, data: { income } };
		}
	};

	// Seeded from the draft, rendered as a plain rand amount with no currency symbol so it round-
	// trips cleanly back through parseRandsToCents on submit.
	// Read once, deliberately: a failed submit re-runs the load, and re-seeding there would
	// overwrite the amount the applicant had just typed.
	let income = $state(
		untrack(() =>
			data.draft.monthlyIncomeCents !== undefined
				? String(data.draft.monthlyIncomeCents / 100)
				: ''
		)
	);
	let proofFile = $state<File | null>(null);
	let previewUrl = $state<string | null>(null);
	let proofKey = $state(0);
	let draggingOver = $state(false);

	function isAcceptedProof(file: File) {
		return file.type.startsWith('image/') || file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
	}

	function setProof(file: File | null) {
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		proofFile = file;
		previewUrl = file?.type.startsWith('image/') ? URL.createObjectURL(file) : null;
	}

	function onProofInput(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		setProof(input.files?.[0] ?? null);
	}

	function onDragEnter(event: DragEvent) {
		event.preventDefault();
		draggingOver = true;
	}

	function onDragOver(event: DragEvent) {
		event.preventDefault();
		if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
	}

	function onDragLeave(event: DragEvent) {
		const current = event.currentTarget as HTMLElement;
		const related = event.relatedTarget as Node | null;
		if (related && current.contains(related)) return;
		draggingOver = false;
	}

	function onDrop(event: DragEvent) {
		event.preventDefault();
		draggingOver = false;
		const files = event.dataTransfer?.files;
		const file = files?.[0] && isAcceptedProof(files[0]) ? files[0] : null;
		if (file) setProof(file);
	}

	function clearProof() {
		setProof(null);
		proofKey += 1;
	}

	function proofSize(file: File) {
		if (file.size < 1024) return `${file.size} B`;
		if (file.size < 1024 * 1024) return `${(file.size / 1024).toFixed(1)} KB`;
		return `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
	}

	// With JavaScript on, `validatedSubmit` sets these directly — from its own client-side parse, or
	// from what the action sent back. With JavaScript off there is no parse and no enhance callback:
	// the action's `fail()` re-renders this page and its errors arrive on the `form` prop, which is
	// then the only place they exist. Client errors win when both are present, so the two paths
	// never disagree.
	let clientErrors = $state<Record<string, string> | null>(null);
	const errors = $derived(clientErrors ?? form?.errors ?? {});

	// Completeness, not validity — same reasoning as the details step: a non-empty value is enough
	// to enable Continue, and pressing it is what surfaces a value that doesn't actually parse.
	const complete = $derived(Boolean(income));

	const submit = validatedSubmit(incomeForm, () => ({ income }), (e) => (clientErrors = e));
</script>

<svelte:head><title>Your income | Yellow</title></svelte:head>

<form method="POST" use:enhance={submit} class="flex flex-col gap-5">
	<div>
		<Label for="income" class="mb-1.5">What do you earn each month, before deductions?</Label>
		<!--
			The R is a fixed prefix inside the field, not part of the placeholder. A placeholder
			disappears the moment you type, so the currency vanished exactly when the number appeared
			and there was nothing left saying what the digits meant. The input's own value stays a bare
			amount, so it still round-trips through `parseRandsToCents` untouched — the symbol is
			decoration and never reaches the form data. `aria-hidden` keeps a screen reader from
			reading a stray letter before the field it labels.
		-->
		<div class="relative">
			<span
				class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-base text-muted-foreground"
				aria-hidden="true">R</span
			>
			<Input
				id="income"
				name="income"
				bind:value={income}
				inputmode="decimal"
				placeholder="12 500"
				class="pl-7"
				aria-describedby="income-hint income-error"
				aria-invalid={Boolean(errors.income) || undefined}
			/>
		</div>
		<p id="income-hint" class="mt-1.5 text-sm text-muted-foreground">
			We want to provide you with options that work for you.
		</p>
		<FieldError id="income-error" message={errors.income} />
	</div>

	<div>
		<Label for="proof" class="mb-1.5">Proof of income</Label>
		<!--
			Deliberately no `name` here. Upload is a later phase; giving a file input a name in a
			urlencoded form would post only the filename with the bytes silently dropped, which is worse
			than not submitting it at all. Leave this unnamed until the upload phase lands.
		-->
		{#key proofKey}
			<input
				id="proof"
				class="peer sr-only"
				type="file"
				accept="image/*,application/pdf"
				aria-describedby="proof-hint"
				onchange={onProofInput}
			/>
		{/key}
		{#if proofFile}
			<div class="flex items-center gap-3 rounded-lg border border-input bg-card p-3">
				{#if previewUrl}
					<img src={previewUrl} alt="" class="size-14 rounded-md object-cover" />
				{:else}
					<div class="flex size-14 items-center justify-center rounded-md bg-muted">
						<FileTextIcon class="size-6" aria-hidden="true" />
					</div>
				{/if}
				<div class="min-w-0 flex-1">
					<p class="truncate text-sm font-medium">{proofFile.name}</p>
					<p class="text-xs text-muted-foreground">{proofSize(proofFile)}</p>
				</div>
				<Button variant="ghost" size="icon" onclick={clearProof} aria-label="Remove proof of income">
					<XIcon />
				</Button>
			</div>
		{:else}
			<div
				role="presentation"
				class={[
					'rounded-lg border border-dashed transition-colors',
					draggingOver ? 'border-foreground bg-muted/40' : 'border-input bg-card'
				]}
				ondragenter={onDragEnter}
				ondragover={onDragOver}
				ondragleave={onDragLeave}
				ondrop={onDrop}
			>
				<label
					for="proof"
					class="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1.5 px-4 py-5 text-center hover:bg-muted/40 peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 [&_*]:pointer-events-none"
				>
					<FileUpIcon class="size-6" aria-hidden="true" />
					<span class="text-sm font-medium">Choose a file</span>
					<span class="text-xs text-muted-foreground">Payslip or bank statement</span>
				</label>
			</div>
		{/if}
		<p id="proof-hint" class="mt-1.5 text-sm text-muted-foreground">
			A payslip or a bank statement. A clear photo is fine. From the last 3 months.
		</p>
	</div>

	<div class="flex gap-3">
		<Button size="pill" variant="outline" href="/apply/details" class="flex-1">Back</Button>
		<Button size="pill" type="submit" disabled={!complete} class="flex-1">Continue</Button>
	</div>
</form>
