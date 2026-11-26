import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { mkdirSync } from "node:fs";
import path from "node:path";
import pg from "pg";
import * as schema from "./schema";

/** Both drivers expose the same query builder; we type against the PGlite flavour. */
export type Db = PgliteDatabase<typeof schema>;

const MIGRATIONS = path.join(process.cwd(), "src/server/db/migrations");

/** Open a database and run migrations. `memory` is for tests. */
export async function openDb(opts: { memory?: boolean } = {}): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url && !opts.memory) {
    const pool = new pg.Pool({ connectionString: url, max: 5 });
    const db = drizzlePg(pool, { schema });
    await migratePg(db, { migrationsFolder: MIGRATIONS });
    return db as unknown as Db;
  }
  let client: PGlite;
  if (opts.memory) {
    client = new PGlite();
  } else {
    const dir = path.join(process.cwd(), ".data/pglite");
    mkdirSync(dir, { recursive: true });
    client = new PGlite(dir);
  }
  const db = drizzlePglite(client, { schema });
  await migratePglite(db, { migrationsFolder: MIGRATIONS });
  return db;
}

const g = globalThis as unknown as { __shelfmateDb?: Promise<Db> };

/** Shared app database (survives dev hot reloads). Seeds the demo store into an empty DB. */
export function getDb(): Promise<Db> {
  if (!g.__shelfmateDb) {
    g.__shelfmateDb = (async () => {
      const db = await openDb();
      const { seedIfEmpty } = await import("./seed");
      await seedIfEmpty(db);
      return db;
    })();
    g.__shelfmateDb.catch(() => {
      g.__shelfmateDb = undefined;
    });
  }
  return g.__shelfmateDb;
}
