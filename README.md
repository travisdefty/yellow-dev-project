# Yellow loan application

Take-home: a South African phone-finance application. Capture ID and date of birth, income (with proof), and a phone; quotes are daily instalments over 360 days. Eligibility (SA ID, age 18–65, unique ID, affordability) and quote math run on the server.

pnpm workspace. `apps/web` is SvelteKit with shadcn-svelte and bits-ui on Tailwind v4, themed to
Yellow's palette (charcoal primary, yellow accent, 5px radius) with self-hosted Poppins. Fastify
(`apps/api`), shared domain (`packages/domain`), and Postgres are next.

The wizard is one route per step, so refresh and the back button work with nothing to restore.
The start page is prerendered; the steps are server-rendered, and everything priced is assembled
in a `+page.server.ts` and handed to the components finished — no rate, term or price arithmetic
ever reaches the browser. Phones currently come from a fixture under `apps/web/src/lib/server/`;
that module is what the API replaces.

Requires Node 22+.

## Local

```sh
pnpm install
pnpm dev
```

Opens the SvelteKit app at `http://localhost:5173`.

```sh
pnpm build      # production build (adapter-node → apps/web/build)
pnpm preview    # serve that build locally
pnpm check      # svelte-check
```

## Hosting

Deployed on [Fly.io](https://fly.io) as `yellow-travisdefty`, one Machine in Johannesburg (`jnb`). Docker builds the workspace and runs `node build` on port 3000 (`@sveltejs/adapter-node`). TLS and HTTP terminate at Fly; the app reads `X-Forwarded-Proto` / `X-Forwarded-Host`.

- Live: <https://app.yellow.travisdefty.co.za/>
- Fly default: <https://yellow-travisdefty.fly.dev>

```sh
fly deploy --ha=false
```
