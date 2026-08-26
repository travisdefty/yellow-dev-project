/**
 * Where the SQLite file and income proofs live. One directory locally (`./data`) so they sit
 * beside each other the way they do on Fly (`/data`). Override with `DATA_DIR`, or with
 * `DB_PATH` / `PROOF_DIR` for a single path.
 *
 * Not read through `$env/dynamic/private` because drizzle-kit imports this outside SvelteKit.
 */
import { join } from 'node:path';

export const DATA_DIR = process.env.DATA_DIR ?? './data';
export const DB_PATH = process.env.DB_PATH ?? join(DATA_DIR, 'yellow.db');
export const PROOF_DIR = process.env.PROOF_DIR ?? join(DATA_DIR, 'proofs');
