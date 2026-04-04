import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("localhost") || connectionString.includes("railway.internal")
    ? false
    : { rejectUnauthorized: false },
});

async function init() {
  const client = await pool.connect();
  try {
    console.log("Creating tables if not exists...");

    await client.query(`
      CREATE TABLE IF NOT EXISTS "mailboxes" (
        "id" serial PRIMARY KEY,
        "address" text NOT NULL UNIQUE,
        "name" text,
        "session_id" text,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "expires_at" timestamp with time zone,
        "last_activity" timestamp with time zone
      )
    `);

    await client.query(`ALTER TABLE "mailboxes" ADD COLUMN IF NOT EXISTS "session_id" text`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "messages" (
        "id" serial PRIMARY KEY,
        "mailbox_address" text NOT NULL REFERENCES "mailboxes"("address") ON DELETE CASCADE,
        "from_address" text NOT NULL,
        "from_name" text,
        "subject" text NOT NULL,
        "body_text" text,
        "body_html" text,
        "is_read" boolean NOT NULL DEFAULT false,
        "received_at" timestamp with time zone NOT NULL DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "api_keys" (
        "id" serial PRIMARY KEY,
        "key_hash" text NOT NULL UNIQUE,
        "key_prefix" text NOT NULL,
        "name" text NOT NULL,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "last_used_at" timestamp with time zone
      )
    `);

    await client.query(`ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "key_hash" text`);
    await client.query(`ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "key_prefix" text`);

    await client.query(`
      UPDATE "api_keys"
      SET "key_hash" = "key", "key_prefix" = LEFT("key", 12)
      WHERE "key_hash" IS NULL AND "key" IS NOT NULL
    `).catch(() => {});

    console.log("Database tables ready.");
  } finally {
    client.release();
    await pool.end();
  }
}

init().catch((err) => {
  console.error("Failed to initialize database:", err);
  process.exit(1);
});
