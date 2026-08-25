/**
 * Opens the database, brings the schema up to date, and seeds the catalogue if it is empty.
 *
 * All of that happens at module load, once per process, on the first import — which is a
 * deliberate choice over doing it in `server.js`. The entry point lives outside the Vite build and
 * cannot import `$lib`, so wiring it there would mean a second, duplicate view of the schema. A
 * module-level side effect is the smaller evil, and it means `pnpm dev`, `node server.js` and the
 * test harnesses all get an identical, ready database without any of them knowing to ask.
 *
 * The failure mode this guards against is the loud one: if migrations cannot run, the process dies
 * at boot with the reason, rather than serving a wizard that 500s on the first form submission.
 */
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { sql } from 'drizzle-orm';
import * as schema from './schema.ts';
import { phoneSeed, pricingSeed } from './seed.ts';

// On Fly this is /data/yellow.db on the mounted volume. Locally it is a gitignored file in the
// web app. Not read through `$env/dynamic/private` because this module is imported by the
// migration tooling too, which runs outside SvelteKit and has no $env.
const DB_PATH = process.env.DB_PATH ?? './local.db';

// The volume is mounted at /data, but on a first-ever boot the directory can exist while the file
// does not — and better-sqlite3 will not create a missing *directory* for us.
const dir = dirname(DB_PATH);
if (dir && dir !== '.' && !existsSync(dir)) mkdirSync(dir, { recursive: true });

const sqlite = new Database(DB_PATH);

// WAL lets a read run while a write is in flight, which matters here because a single wizard step
// does a read (the guard) and a write (the patch) inside one request. `foreign_keys` is off by
// default in SQLite — without this the references in schema.ts would be documentation, not rules.
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });

migrate(db, { migrationsFolder: process.env.DRIZZLE_MIGRATIONS ?? './drizzle' });

seedCatalogue();

/**
 * Fills the catalogue only when it is empty. Not an upsert: a rate someone changed in the database
 * is data, and a redeploy has no business quietly reverting it to whatever is in the source tree.
 */
function seedCatalogue(): void {
	const [{ count }] = db.select({ count: sql<number>`count(*)` }).from(schema.phones).all();
	if (count > 0) return;

	db.transaction((tx) => {
		tx.insert(schema.phones).values([...phoneSeed]).run();
		tx.insert(schema.phonePricing).values(pricingSeed).run();
	});
}

export * from './schema.ts';
