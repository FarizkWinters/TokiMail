import { lt, sql } from "drizzle-orm";
import { db, messagesTable, mailboxesTable } from "@workspace/db";
import { logger } from "./logger";

const MESSAGE_TTL_DAYS = 7;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // every 1 hour

async function runCleanup() {
  try {
    const cutoff = new Date(Date.now() - MESSAGE_TTL_DAYS * 24 * 60 * 60 * 1000);

    const deleted = await db
      .delete(messagesTable)
      .where(lt(messagesTable.receivedAt, cutoff))
      .returning({ id: messagesTable.id });

    if (deleted.length > 0) {
      logger.info({ count: deleted.length, olderThan: cutoff }, "Cleaned up old messages");
    }

    // Also remove mailboxes that have no messages and are older than 7 days
    await db.execute(sql`
      DELETE FROM mailboxes
      WHERE created_at < ${cutoff}
      AND id NOT IN (SELECT DISTINCT mailbox_address FROM messages LIMIT 1)
      AND address NOT IN (SELECT mailbox_address FROM messages)
    `);
  } catch (err) {
    logger.error({ err }, "Cleanup job failed");
  }
}

export function startCleanupJob() {
  logger.info({ intervalHours: 1, ttlDays: MESSAGE_TTL_DAYS }, "Cleanup job started");
  runCleanup();
  setInterval(runCleanup, CLEANUP_INTERVAL_MS);
}
