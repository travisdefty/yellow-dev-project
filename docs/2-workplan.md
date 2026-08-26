# Workplan

Five hours. Check each phase before the next. `apps/web` already exists.

```
apps/web          SvelteKit wizard (temporary +server routes in phase 3)
apps/api          Fastify (from phase 4)
packages/domain   functions + Zod (from phase 2)
```

## 1. Mocked front-end, deploy to Fly

Theme the existing app: tokens, Poppins, 16px inputs. Shell routes for start → details → income → phone → review → confirmation. Static fixture phones. Daily price hardcoded on the card.

**Done when** a public URL loads on a phone-sized viewport.

## 2. Wizard against fixtures

Back, forward, and refresh keep step state (one route per step). Client Zod. Continue enabled on completeness, not silent validity. Identity read-only after accept. Toasts. Pagination.

Introduce `packages/domain` here: SA ID, age and risk, money, pricing, shared schemas. The wizard is the first consumer. Quotes on cards still come from fixtures, not from client-side rate math.

**Done when** the flow click-throughs without an API, and ID / DOB / age failures show as field errors.

## 3. SvelteKit API routes, still fixtures

The same three endpoints as `+server.ts`, in-memory store. Eligibility and quote run in the handler via domain. The web app talks to itself.

**Done when** checksum, birthday mismatch, age, extra fields, and unaffordable submit are asserted against those routes.

## 4. Fastify backend, deploy, still fixtures

The same three endpoints on `apps/api`. Point the web app at Fastify. Delete the SvelteKit API routes. Redeploy.

**Done when** the live site hits Fastify, posting `riskGroup` or `depositBps` is a 400, and the stored quote matches the domain tests.

## 5. Postgres, persist, test again

Drizzle for `phones`, `risk_group_rates`, `applications`. Unique ID. Seed three rate rows (one per risk group) and the catalogue. README and Loom. Mock payment only if time remains.

**Done when** a second application on the same ID fails at the database, and a refresh after a patch still shows saved data.

## Cut order

Bottom up: mock payment → income file upload → pagination (capped list) → risk bands (one rate row per group).

Do not cut the wizard, unique ID, or server-side quote. If Fastify is late, demo on the SvelteKit routes rather than shipping an empty API app.
