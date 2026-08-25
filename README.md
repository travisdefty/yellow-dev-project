# Yellow loan application

Take-home: a South African phone-finance application. Capture ID and date of birth, income, and a
phone; quotes are daily instalments over 360 days. Eligibility (SA ID checksum, age 18–65, unique
ID, affordability) and all quote arithmetic run on the server.

pnpm workspace:

```
apps/web          SvelteKit wizard + the API it talks to
packages/domain   SA ID, age and risk, money, pricing, eligibility, shared Zod schemas
```

Requires Node 22+.

## Two deliberate divergences from the specification

Both were taken under the five-hour budget, and both are real trade-offs rather than oversights.

**The API is SvelteKit `+server.ts` routes, not Fastify.** The specification names `apps/api` on
Fastify. Standing up, deploying and debugging a second service was the most expensive remaining
item and the least visible in the result, so the workplan's own fallback applies — *"if Fastify is
late, demo on the SvelteKit routes rather than shipping an empty API app."*

The cost is honest: the strict-schema boundary is enforced in the same process that calls it, so it
proves less than two processes would. What is mitigated is the porting cost. Every endpoint's logic
lives in `apps/web/src/lib/server/api/` as plain functions over plain input that import nothing from
`@sveltejs/kit` — the route files are six-line adapters, and `$lib/server/respond.ts` is the only
piece that knows what framework it is running in. Pointing these at Fastify means writing the
equivalent of that one file.

**Storage is SQLite on a Fly volume, not Postgres.** One app, one machine, one file at
`/data/yellow.db`; no second deploy target, no connection string, no cross-region round trip from
`jnb`. The schema is written to be portable — integer cents, integer basis points, text dates, no
SQLite-specific types — so moving to Postgres is a driver swap and a regenerated migration. The
cost is that the app cannot scale past one machine, because a volume cannot be shared.

**Also known and not fixed:** ID numbers and dates of birth are stored in the clear, which is a real
POPIA gap next to a consent checkbox whose wording is a placeholder. The API is unauthenticated —
`/api/applications/:id` is a capability URL whose id lives in an `httpOnly` cookie, which is
adequate for a demo and not for anything else. Income-proof upload, mock payment and collection
points are out, in that order.

## How it is put together

**One route per step**, so refresh and the back button work with nothing to restore. Every screen
works with JavaScript disabled: forms are real form actions, and the whole flow was verified by
driving it over plain HTML and HTTP with no browser involved.

**Nothing priced reaches the browser.** Rates live on `phone_pricing` rows, the quote is computed
server-side, and the components receive finished cents. `apps/web/src/lib/server/` makes importing
any of it from client code a build error rather than a review comment.

**The client never sends anything priced either.** `patchSchema` is a strict discriminated union, so
posting `riskGroup`, `depositBps` or `dailyCents` is a 400 rather than a silently ignored field. The
risk group is derived from age server-side once, at the moment identity is accepted, and never
recomputed — so a birthday rolling over mid-application cannot reprice a quote already shown.

**Rules are enforced on the write, not on the route.** Step order, the identity lock, affordability
and consent are all checked in `patchApplication`, so no path through the UI — or around it — can
reach a state they forbid. The route guards exist only so nobody *lands* on a form that cannot
succeed.

**One application per ID, at the database.** A partial unique index covers submitted rows only:

```sql
CREATE UNIQUE INDEX applications_id_number_submitted
  ON applications(id_number) WHERE status = 'submitted';
```

A plain unique index would let one abandoned half-filled draft lock a real applicant out of their
own ID forever. The constraint violation is caught and returned as a field error on `idNumber`.

**The quote is stored, not re-derived.** Submit writes the cash price, both rates and all five
amounts onto the application. A quote is a promise made at a moment in time; re-deriving it on read
would silently restate the offer every time a pricing row moved.

### API

| | |
|---|---|
| `POST /api/applications` | start one; returns the id that becomes the applicant's reference |
| `GET /api/applications/:id` | the application, with the chosen phone priced |
| `PATCH /api/applications/:id` | one step's answers — `{ step, data }`. Submit is the last patch |
| `GET /api/phones?applicationId=&page=` | catalogue, quoted at that application's band, filtered to what it can afford, paginated |

The wizard calls these through `event.fetch`, which SvelteKit resolves straight to the handler with
no network round trip — a real boundary at no cost. `GET /phones` takes an application id rather
than a risk group, because a risk group in a query string is a rate the client got to choose.

## Local

```sh
pnpm install
pnpm dev        # http://localhost:5173
pnpm check      # svelte-check
pnpm build      # adapter-node → apps/web/build
```

The database is created, migrated and seeded on first import — no setup step. `DB_PATH` defaults to
`./local.db`; delete that file to start over.

```sh
cd apps/web && pnpm exec drizzle-kit generate   # after editing db/schema.ts
```

To run the production build the way Fly does, `ORIGIN` must match the address you browse to, or
every form action answers 403:

```sh
cd apps/web && ORIGIN=http://localhost:3000 DB_PATH=./local.db node server.js
```

## Hosting

[Fly.io](https://fly.io) as `yellow-travisdefty`, a single Machine in Johannesburg (`jnb`), with a
volume mounted at `/data`. Create it once before the first deploy:

```sh
fly volumes create yellow_data --region jnb --size 1
fly deploy --ha=false
```

- Live: <https://app.yellow.travisdefty.co.za/>
- Fly default: <https://yellow-travisdefty.fly.dev>
