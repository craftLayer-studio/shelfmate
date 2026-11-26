import { sql } from "drizzle-orm";
import { openDb } from "./client";
import { seedDemo } from "./seed";

/** `pnpm db:seed`: wipe the database and load the demo store again. */
async function main() {
  const db = await openDb();
  await db.execute(sql`TRUNCATE orgs, otp_codes CASCADE`);
  await seedDemo(db);
  console.log("Seeded demo store: Annapurna Kirana Stores (Demo)");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
