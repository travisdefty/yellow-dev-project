# Yellow loan application

A South African phone-finance wizard. The applicant enters ID and date of birth, income, and a
phone; the quote is a daily instalment over 360 days. Eligibility (SA ID checksum, age 18–65,
unique ID, affordability) and all quote arithmetic run on the server.

Live: <https://app.yellow.travisdefty.co.za/>

Requires Node 22+ and pnpm.

## Run locally

```sh
pnpm install
pnpm dev        # http://localhost:5173
pnpm check      # svelte-check
pnpm build      # adapter-node → apps/web/build
pnpm db:studio  # browse SQLite in the browser
```

The database is created, migrated and seeded on first import — no setup step. `DB_PATH` defaults to
`./data/yellow.db`; proofs default to `./data/proofs`.

```sh
cd apps/web && pnpm exec drizzle-kit generate   # after editing db/schema.ts
```

To run the production build the way Fly does, `ORIGIN` must match the address you browse to, or
every form action answers 403:

```sh
cd apps/web && ORIGIN=http://localhost:3000 node server.js
```

## Try it

Copy these through the wizard. Each ID passes the checksum and agrees with the date of birth. Tick
the consent box on details. Proof of income is required but not read — upload
[`docs/example-payslip.jpg`](docs/example-payslip.jpg). A second submit with the same ID fails until
that row is deleted (see [Inspect / reset the database](#inspect--reset-the-database)).

| | Sipho Nkosi | Thandi Mokoena | Johan van der Berg | Ayanda Dlamini |
|---|---|---|---|---|
| First name | Sipho | Thandi | Johan | Ayanda |
| Last name | Nkosi | Mokoena | van der Berg | Dlamini |
| Mobile | `0821234567` | `0734567890` | `0612345678` | `0845678901` |
| ID number | `0003155808086` | `8402200912087` | `6401106200086` | `9806272341083` |
| Date of birth | 15 / 03 / 2000 | 20 / 02 / 1984 | 10 / 01 / 1964 | 27 / 06 / 1998 |
| Monthly income | `18000` | `8500` | `25000` | `12000` |
| Risk band | A (18–30) | B (31–50) | C (51–65) | A (18–30) |

`18000` is enough for every handset in every band. `8500` hides the flagships and leaves the cheaper phones.

## What's in the repo

pnpm workspace:

```
apps/web          SvelteKit wizard + the API it talks to
packages/domain   SA ID, age and risk, money, pricing, eligibility, shared Zod schemas
```

## How it works

**One route per step**, so refresh and the back button work with nothing to restore. Every screen
works with JavaScript disabled: forms are real form actions, and the whole flow was verified by
driving it over plain HTML and HTTP with no browser involved.

**Nothing priced reaches the browser.** Rates live on `risk_group_rates` (one row per band), the
quote is computed server-side from that band and the phone's cash price, and the components receive
finished cents. `apps/web/src/lib/server/` makes importing any of it from client code a build error
rather than a review comment.

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

Application reads and writes require the `yl_app` session cookie (application id plus a secret
token). Knowing the id alone is not enough. Confirmation URLs use the public reference (`YL-…`),
not the internal uuid.

### API

| | |
|---|---|
| `POST /api/applications` | start one; returns the DTO plus a one-time `sessionToken` stored in the session cookie |
| `GET /api/applications/:id` | the application, with the chosen phone priced; requires the session cookie |
| `PATCH /api/applications/:id` | one step's answers — `{ step, data }`. Submit is the last patch; requires the session cookie |
| `GET /api/phones?page=` | catalogue, quoted at the cookie's application's band, filtered to what it can afford, paginated |

The wizard calls these through `event.fetch`, which SvelteKit resolves straight to the handler with
no network round trip. `GET /phones` takes the application from the session cookie rather than a
risk group, because a risk group in a query string is a rate the client got to choose.

## Notes vs the brief

The original brief is in [`docs/1-specifications.md`](docs/1-specifications.md). Two stack choices
differ, and a few extras were left out:

- The API is SvelteKit `+server.ts` routes, not a separate Fastify app. Endpoint logic lives in
  `apps/web/src/lib/server/api/` as plain functions that import nothing from `@sveltejs/kit`.
- Storage is SQLite on a Fly volume, not Postgres. The schema uses integer cents, integer basis
  points and text dates — no SQLite-specific types.
- Known gaps: ID numbers and dates of birth are stored in the clear; income proof is uploaded but
  not read; there is no mock payment.

## Hosting

[Fly.io](https://fly.io) as `yellow-travisdefty`, a single Machine in Johannesburg (`jnb`), with a
volume mounted at `/data`. Create the volume once before the first deploy:

```sh
fly volumes create yellow_data --region jnb --size 1
fly deploy --ha=false
```

- Live: <https://app.yellow.travisdefty.co.za/>
- Fly default: <https://yellow-travisdefty.fly.dev>

## Inspect / reset the database

SQLite is a file, not a server. There is no admin API — ID numbers live in the clear, and a list
or delete route would be a public leak. Browse and edit the file with a client.

Local: `apps/web/data/yellow.db`. Remote: `/data/yellow.db` on the Fly volume. Delete **rows in
`applications`**, not the whole file, unless you want a full wipe. A second test with the same ID
fails until that submitted row is gone. Proof files live beside the DB (`apps/web/data/proofs`
locally, `/data/proofs` on Fly); deleting rows does not remove them.

**View locally** — Drizzle Studio, fine while `pnpm dev` is running:

```sh
pnpm db:studio
```

Or `sqlite3 apps/web/data/yellow.db` then `SELECT id, status, id_number, public_reference, created_at FROM applications;`

**View on Fly** — the runtime image does not include `sqlite3`. Install it once, then query:

```sh
fly ssh console -a yellow-travisdefty -C "apt-get update && apt-get install -y sqlite3"
fly ssh console -a yellow-travisdefty -C "sqlite3 /data/yellow.db 'SELECT id, status, id_number, public_reference FROM applications;'"
```

Or copy the file down and open it in Studio. If the app is live, copy `.db`, `.db-wal`, and `.db-shm` together:

```sh
fly sftp get -a yellow-travisdefty /data/yellow.db ./yellow-prod.db
```

**Empty applications locally** (keep phones and rates):

```sh
sqlite3 apps/web/data/yellow.db "DELETE FROM applications;"
rm -rf apps/web/data/proofs
```

**Full local wipe.** Next `pnpm dev` recreates the file and reseeds the catalogue:

```sh
rm -f apps/web/data/yellow.db apps/web/data/yellow.db-wal apps/web/data/yellow.db-shm
rm -rf apps/web/data/proofs
```

**Empty applications on Fly:**

```sh
fly ssh console -a yellow-travisdefty -C "sqlite3 /data/yellow.db 'DELETE FROM applications;'"
fly ssh console -a yellow-travisdefty -C "rm -rf /data/proofs"
```

Delete one row by public code the same way: `DELETE FROM applications WHERE public_reference = 'YL-…';`. Do not `rm /data/yellow.db` while the process is running. Stop the machine first if you ever need a full remote wipe; boot will migrate and reseed phones/rates if the file is gone.
