import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const mailboxesTable = pgTable("mailboxes", {
  id: serial("id").primaryKey(),
  address: text("address").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  lastActivity: timestamp("last_activity", { withTimezone: true }),
});

export const insertMailboxSchema = createInsertSchema(mailboxesTable).omit({ id: true, createdAt: true });
export type InsertMailbox = z.infer<typeof insertMailboxSchema>;
export type Mailbox = typeof mailboxesTable.$inferSelect;
