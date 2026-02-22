import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error("Missing TURSO_DATABASE_URL.");
  process.exit(1);
}

const client = createClient(authToken ? { url, authToken } : { url });

const statements = [
  `CREATE TRIGGER IF NOT EXISTS bookmark_cleanup_study_plan_delete
   AFTER DELETE ON "StudyPlans"
   BEGIN
     DELETE FROM "Bookmark"
     WHERE entityType = 'plan'
       AND entityId = CAST(OLD.id AS TEXT);
   END;`,
];

try {
  for (const statement of statements) {
    await client.execute(statement);
  }
  console.log("Applied bookmark cleanup triggers for study-planner.");
} finally {
  client.close();
}
