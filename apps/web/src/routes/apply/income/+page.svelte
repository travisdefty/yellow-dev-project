<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import FieldError from '$lib/components/FieldError.svelte';
	import FileUpIcon from '@lucide/svelte/icons/file-up';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import XIcon from '@lucide/svelte/icons/x';
	import { untrack, onDestroy } from 'svelte';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { prepareFileUpload, isAcceptedProof, PROOF_ACCEPT, PROOF_TYPE_ERROR } from '$lib/upload';
	import { toast } from 'svelte-sonner';
	import { formatCentsAsRandsInput, incomeSchema, parseRandsToCents } from '@yellow/domain';
	import { isAllowedIncomeInput, onIncomeBeforeInput } from '$lib/digits';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const INCOME_ERROR = 'Enter an amount, for example R 12 500.';
	const PROOF_REQUIRED = 'Upload a payslip or bank statement.';

	const seedIncome = untrack(() =>
		data.draft.monthlyIncomeCents !== undefined
			? formatCentsAsRandsInput(data.draft.monthlyIncomeCents)
			: ''
	);
	let income = $state(seedIncome);
	let lastAllowedIncome = seedIncome;
	const savedProofName = untrack(() => data.draft.proofFilename ?? '');
	const savedIsImage = untrack(() => Boolean(data.draft.proofIsImage));

	let proofInput: HTMLInputElement | undefined;
	let proofFile = $state<File | null>(null);
	let proofThumb = $state<File | null>(null);
	let previewUrl = $state<string | null>(null);
	let proofKey = $state(0);
	let draggingOver = $state(false);
	let preparing = $state(false);
	let submitting = $state(false);
	let savedThumbFailed = $state(false);
	let prepareGen = 0;

	let clientErrors = $state<Record<string, string> | null>(null);
	const errors = $derived<Record<string, string>>(clientErrors ?? form?.errors ?? {});

	const hasProof = $derived(Boolean(proofFile || savedProofName));

	function onIncomeFieldInput(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		if (!isAllowedIncomeInput(input.value)) {
			input.value = lastAllowedIncome;
			income = lastAllowedIncome;
			return;
		}
		lastAllowedIncome = input.value;
		income = input.value;
	}

	onDestroy(() => {
		if (previewUrl) URL.revokeObjectURL(previewUrl);
	});

	function setProof(file: File | null, thumb: File | null = null) {
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		proofFile = file;
		proofThumb = thumb;
		previewUrl = thumb ? URL.createObjectURL(thumb) : null;
	}

	function assignToInput(file: File) {
		if (!proofInput) return;
		const transfer = new DataTransfer();
		transfer.items.add(file);
		proofInput.files = transfer.files;
	}

	function resetInput() {
		proofKey += 1;
	}

	async function acceptProof(file: File, fromInput = false) {
		if (!isAcceptedProof(file)) {
			clientErrors = { proof: PROOF_TYPE_ERROR };
			if (fromInput) resetInput();
			return;
		}

		clientErrors = null;
		const gen = ++prepareGen;
		preparing = true;
		try {
			const prepared = await prepareFileUpload(file);
			if (gen !== prepareGen) return;
			assignToInput(prepared.file);
			setProof(prepared.file, prepared.thumb);
		} catch {
			if (gen !== prepareGen) return;
			toast.error('Could not prepare that file. Try another photo or PDF under 5 MB.');
			setProof(null);
			resetInput();
		} finally {
			if (gen === prepareGen) preparing = false;
		}
	}

	function onProofInput(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		void acceptProof(file, true);
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
		const file = event.dataTransfer?.files?.[0];
		if (file) void acceptProof(file);
	}

	function clearProof() {
		prepareGen += 1;
		preparing = false;
		setProof(null);
		resetInput();
	}

	function proofSize(file: File) {
		if (file.size < 1024) return `${file.size} B`;
		if (file.size < 1024 * 1024) return `${(file.size / 1024).toFixed(1)} KB`;
		return `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
	}

	const submit: SubmitFunction = ({ formData, cancel }) => {
		const incomeValue = String(formData.get('income') ?? '');
		const cents = parseRandsToCents(incomeValue);
		if (cents === null || !incomeSchema.safeParse({ monthlyIncomeCents: cents }).success) {
			clientErrors = { income: INCOME_ERROR };
			cancel();
			return;
		}

		const proof = formData.get('proof');
		const hasNewProof = proof instanceof File && proof.size > 0;
		if (!hasNewProof && !savedProofName) {
			clientErrors = { proof: PROOF_REQUIRED };
			cancel();
			return;
		}

		clientErrors = {};
		if (proofThumb) formData.set('proofThumb', proofThumb);

		submitting = true;
		return async ({ result, update }) => {
			try {
				if (result.type === 'failure') {
					const failure = result.data as
						| { errors?: Record<string, string>; message?: string }
						| undefined;
					if (failure?.errors) clientErrors = failure.errors;
					if (failure?.message) toast.error(failure.message);
					return;
				}
				await update({ reset: false });
			} finally {
				submitting = false;
			}
		};
	};
</script>

<svelte:head><title>Your income | Yellow</title></svelte:head>

<form method="POST" enctype="multipart/form-data" use:enhance={submit} class="flex flex-col gap-5">
	<div>
		<Label for="income" class="mb-1.5">What do you earn each month, before deductions?</Label>
		<div class="relative">
			<span
				class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-base text-muted-foreground"
				aria-hidden="true">R</span
			>
			<Input
				id="income"
				name="income"
				bind:value={income}
				onbeforeinput={onIncomeBeforeInput}
				oninput={onIncomeFieldInput}
				inputmode="decimal"
				placeholder="12 500"
				class="pl-7"
				aria-describedby="income-hint income-error"
				aria-invalid={Boolean(errors.income) || undefined}
			/>
		</div>
		<p id="income-hint" class="mt-1.5 text-sm text-muted-foreground">
			Whole rands or cents — up to two decimal places.
		</p>
		<FieldError id="income-error" message={errors.income} />
	</div>

	<div>
		<Label for="proof" class="mb-1.5">Proof of income <span class="text-negative">*</span></Label>
		{#key proofKey}
			<input
				id="proof"
				class="peer sr-only"
				type="file"
				name="proof"
				accept={PROOF_ACCEPT}
				aria-describedby="proof-hint proof-error"
				aria-invalid={Boolean(errors.proof) || undefined}
				onchange={onProofInput}
				{@attach (node: HTMLInputElement) => {
					proofInput = node;
					return () => {
						if (proofInput === node) proofInput = undefined;
					};
				}}
			/>
		{/key}
		<div
			role="presentation"
			class="rounded-lg peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50"
			ondragenter={onDragEnter}
			ondragover={onDragOver}
			ondragleave={onDragLeave}
			ondrop={onDrop}
		>
			{#if proofFile}
				<div
					class={[
						'flex items-center gap-3 rounded-lg border bg-card p-3',
						draggingOver ? 'border-foreground' : 'border-input',
						errors.proof ? 'border-destructive' : ''
					]}
				>
					{#if previewUrl}
						<img src={previewUrl} alt="" class="size-14 shrink-0 rounded-md object-cover" />
					{:else}
						<div class="flex size-14 shrink-0 items-center justify-center rounded-md bg-muted">
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
			{:else if savedProofName}
				<label
					for="proof"
					class={[
						'flex cursor-pointer items-center gap-3 rounded-lg border bg-card p-3 hover:bg-muted/40',
						draggingOver ? 'border-foreground' : 'border-input',
						errors.proof ? 'border-destructive' : ''
					]}
				>
					{#if savedIsImage && !savedThumbFailed}
						<img
							src="/apply/income/proof"
							alt=""
							class="size-14 shrink-0 rounded-md object-cover"
							onerror={() => (savedThumbFailed = true)}
						/>
					{:else}
						<div class="flex size-14 shrink-0 items-center justify-center rounded-md bg-muted">
							<FileTextIcon class="size-6" aria-hidden="true" />
						</div>
					{/if}
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium">{savedProofName}</p>
						<p class="text-xs text-muted-foreground">Already uploaded — choose a new file to replace it</p>
					</div>
				</label>
			{:else}
				<div
					class={[
						'rounded-lg border border-dashed transition-colors',
						draggingOver ? 'border-foreground bg-muted/40' : 'border-input bg-card',
						errors.proof ? 'border-destructive' : ''
					]}
				>
					<label
						for="proof"
						class="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1.5 px-4 py-5 text-center hover:bg-muted/40 [&_*]:pointer-events-none"
					>
						<FileUpIcon class="size-6" aria-hidden="true" />
						<span class="text-sm font-medium">Choose a file</span>
						<span class="text-xs text-muted-foreground">Payslip or bank statement</span>
					</label>
				</div>
			{/if}
		</div>
		<p id="proof-hint" class="mt-1.5 text-sm text-muted-foreground">
			A payslip or a bank statement. Files are optimised before upload. From the last 3 months.
		</p>
		<FieldError id="proof-error" message={errors.proof} />
	</div>

	<div class="flex gap-3">
		<Button size="pill" variant="outline" href="/apply/details" class="flex-1">Back</Button>
		<Button size="pill" type="submit" disabled={preparing || submitting} class="flex-1">
			{preparing ? 'Preparing…' : submitting ? 'Saving…' : 'Continue'}
		</Button>
	</div>
</form>
