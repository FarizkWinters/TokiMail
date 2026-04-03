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
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "expires_at" timestamp with time zone,
        "last_activity" timestamp with time zone
      )
    `);

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
        "key" text NOT NULL UNIQUE,
        "name" text NOT NULL,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "last_used_at" timestamp with time zone,
        "is_active" boolean NOT NULL DEFAULT true
      )
    `);

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
