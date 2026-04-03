import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, messagesTable, mailboxesTable } from "@workspace/db";
import {
  ListMessagesParams,
  ListMessagesResponse,
  GetMessageParams,
  GetMessageResponse,
  DeleteMessageParams,
  MarkMessageReadParams,
  MarkMessageReadResponse,
} from "@workspace/api-zod";
import { extractOTPFromMessage } from "../lib/otp";

const router: IRouter = Router();

router.get("/mailboxes/:address/messages", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.address) ? req.params.address[0] : req.params.address;
  const params = ListMessagesParams.safeParse({ address: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [mailbox] = await db
    .select()
    .from(mailboxesTable)
    .where(eq(mailboxesTable.address, params.data.address));

  if (!mailbox) {
    res.status(404).json({ error: "Mailbox not found" });
    return;
  }

  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.mailboxAddress, params.data.address))
    .orderBy(messagesTable.receivedAt);

  const summaries = messages.map((m) => ({
    ...m,
    hasHtml: m.bodyHtml != null && m.bodyHtml.length > 0,
  }));

  const unreadCount = summaries.filter((m) => !m.isRead).length;

  res.json(ListMessagesResponse.parse({
    messages: summaries,
    total: summaries.length,
    unread: unreadCount,
  }));
});

router.get("/mailboxes/:address/messages/:id", async (req, res): Promise<void> => {
  const rawAddr = Array.isArray(req.params.address) ? req.params.address[0] : req.params.address;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetMessageParams.safeParse({ address: rawAddr, id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [message] = await db
    .select()
    .from(messagesTable)
    .where(
      and(
        eq(messagesTable.mailboxAddress, params.data.address),
        eq(messagesTable.id, params.data.id),
      ),
    );

  if (!message) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  res.json(GetMessageResponse.parse(message));
});

router.delete("/mailboxes/:address/messages/:id", async (req, res): Promise<void> => {
  const rawAddr = Array.isArray(req.params.address) ? req.params.address[0] : req.params.address;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteMessageParams.safeParse({ address: rawAddr, id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(messagesTable)
    .where(
      and(
        eq(messagesTable.mailboxAddress, params.data.address),
        eq(messagesTable.id, params.data.id),
      ),
    )
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  res.sendStatus(204);
});

router.patch("/mailboxes/:address/messages/:id/read", async (req, res): Promise<void> => {
  const rawAddr = Array.isArray(req.params.address) ? req.params.address[0] : req.params.address;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = MarkMessageReadParams.safeParse({ address: rawAddr, id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [updated] = await db
    .update(messagesTable)
    .set({ isRead: true })
    .where(
      and(
        eq(messagesTable.mailboxAddress, params.data.address),
        eq(messagesTable.id, params.data.id),
      ),
    )
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  res.json(MarkMessageReadResponse.parse({ ...updated, hasHtml: updated.bodyHtml != null && updated.bodyHtml.length > 0 }));
});

// GET /mailboxes/:address/otp — ambil OTP terbaru dari inbox, cocok untuk bot polling
router.get("/mailboxes/:address/otp", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.address) ? req.params.address[0] : req.params.address;

  const [mailbox] = await db
    .select()
    .from(mailboxesTable)
    .where(eq(mailboxesTable.address, raw));

  if (!mailbox) {
    res.status(404).json({ error: "Mailbox not found" });
    return;
  }

  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.mailboxAddress, raw))
    .orderBy(desc(messagesTable.receivedAt))
    .limit(10);

  for (const msg of messages) {
    const otp = extractOTPFromMessage(msg.subject, msg.bodyText);
    if (otp) {
      res.json({
        found: true,
        otp,
        messageId: msg.id,
        subject: msg.subject,
        from: msg.fromAddress,
        receivedAt: msg.receivedAt,
      });
      return;
    }
  }

  res.json({ found: false, otp: null, messageId: null, subject: null, from: null, receivedAt: null });
});

export default router;
