# Specification

A representative full-stack loan application. Not a tour of every extra. Five hours.

## Stack

pnpm workspace.

- `apps/web` — SvelteKit, shadcn-svelte, bits-ui, Tailwind
- `apps/api` — Fastify
- `packages/domain` — pricing, eligibility, SA ID, money, and `.strict()` Zod schemas

Web and API both depend on `@yellow/domain`. The wizard uses the schemas for client validation. Fastify uses the same schemas plus the quote and eligibility functions. Domain imports no Fastify, Drizzle, or SvelteKit. Zod is an allowed dependency.

Postgres. Fly.io.

## Wizard

One route per step so refresh works.

`/` start → `/apply/details` → `/apply/income` → `/apply/phone` → `/apply/review` → `/apply/confirmation/:slug`

Collection points only if time remains. Not a step.

## Domain

- Ask for ID number and date of birth. An SA ID has no century; DOB supplies it and is a cross-check. Bad checksum → ID field. ID date vs DOB mismatch → both fields (typo, not ineligible).
- Age 18–65 inclusive, full years in `Africa/Johannesburg`. ID unique (database unique index).
- Once identity is accepted, ID and date of birth cannot change. Pricing uses age.
- Money: integer cents and basis points. No floats. Term 360 days. Named constants for term and age bands. Rates live on the pricing row, not in code.
- Quote: `principal = cashPrice * (1 - depositBps/10000)`, `loanAmount = principal * (1 + interestBps/10000)`, `daily = loanAmount / 360`. Assert `deposit + principal == cashPrice`.
- Risk groups from age: 18–30, 31–50, 51–65. Each phone has one pricing row per group. The client never sends rates, risk group, or quoted amounts.
- Affordability is a submit rule, not a catalogue toggle. Monthly income must be `> 10 ×` monthly price. Monthly price = `dailyInstalmentCents * 30`. The server rejects even if the UI hid the device.
- POPIA: required placeholder consent checkbox. Wording is not legal copy.

## API

Three endpoints. Eligibility is a function the patch runs, not a route.

- `GET /phones` — paginated. Quotes computed on the server from the application's locked risk group.
- `POST /applications` — start.
- `PATCH /applications/:id` — each step writes what it has. Submit is the last patch.

Strict Zod. Unknown fields → 400. Never spread a body into a write. Server recomputes the quote and stores those numbers. Client sends phone id and income, nothing priced. Rate-limit ID uniqueness checks. Income proof: multipart on the income or submit patch; store bytes and mime. No OCR.

SvelteKit `+server` routes are a fixture stepping stone. Fastify is the API.

## UI

Hours go to domain and API, not markup. shadcn-svelte generated into the repo. bits-ui for focus and ARIA.

Tokens only: accent `#fcd806`, primary `#33353d`, surface `#f6f6f6`, Poppins, 5px radius. Yellow is the accent, not the primary. Inputs 16px so iPhone does not zoom. Daily price is the hero on the card. No monthly figure. Toasts for non-field errors. Field errors bind to inputs. Catalogue paginates.

## Data

- `phones`
- `phone_pricing` — one row per risk group
- `applications` — bio, income, phone choice, stored quote, consent, optional proof file

## Out of scope

OTP, mock payment (first extra if time), OCR, queues, drafts table, stores, collection points, client-side quote math.
