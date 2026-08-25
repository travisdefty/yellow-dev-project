# Yellow loan application

Take-home: a South African phone-finance application. Capture ID and date of birth, income (with proof), and a phone; quotes are daily instalments over 360 days. Eligibility (SA ID, age 18–65, unique ID, affordability) and quote math run on the server.

pnpm workspace. `apps/web` is SvelteKit (shadcn-svelte, Tailwind). Fastify (`apps/api`), shared domain (`packages/domain`), and Postgres are next.

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

- Live: <https://yellow-travisdefty.fly.dev>
- Intended hostname: `yellow.travisdefty.co.za`

```sh
fly deploy --ha=false
fly certs add yellow.travisdefty.co.za   # then point DNS at the records Fly prints
```
