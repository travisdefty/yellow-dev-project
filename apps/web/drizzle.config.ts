/**
 * drizzle-kit only. The running app never reads this — it migrates itself at boot from the
 * generated SQL in ./drizzle (see src/lib/server/db/index.ts).
 */
import { defineConfig } from 'drizzle-kit';
import { DB_PATH } from './src/lib/server/data-paths.ts';

export default defineConfig({
	dialect: 'sqlite',
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dbCredentials: { url: DB_PATH }
});
