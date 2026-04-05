import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, messagesTable, mailboxesTable } from "@workspace/db";
import { InboundEmailBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/inbound", async (req, res): Promise<void> => {
  const parsed = InboundEmailBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { to, from, fromName, subject, bodyText, bodyHtml, secret } = parsed.data;

  const webhookSecret = process.env.WEBHOOK_SECRET;
  if (webhookSecret && secret !== webhookSecret) {
    req.log.warn({ to }, "Inbound email rejected: invalid secret");
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const toAddress = to.toLowerCase().trim();

  let [mailbox] = await db
    .select()
    .from(mailboxesTable)
    .where(eq(mailboxesTable.address, toAddress));

  if (!mailbox) {
    const inserted = await db
      .insert(mailboxesTable)
      .values({ address: toAddress, sessionId: null })
      .returning();
    mailbox = inserted[0]!;
    req.log.info({ to: toAddress }, "Mailbox auto-created for inbound email");
  }

  const [message] = await db
    .insert(messagesTable)
    .values({
      mailboxAddress: toAddress,
      fromAddress: from,
      fromName: fromName ?? null,
      subject,
      bodyText: bodyText ?? null,
      bodyHtml: bodyHtml ?? null,
      isRead: false,
    })
    .returning();

  await db
    .update(mailboxesTable)
    .set({ lastActivity: new Date() })
    .where(eq(mailboxesTable.address, toAddress));

  req.log.info({ messageId: message?.id, to: toAddress }, "Inbound email stored");
  res.json({ success: true, messageId: message?.id ?? null });
});

export default router;
