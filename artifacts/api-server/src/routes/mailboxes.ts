import { Router, type IRouter } from "express";
import { eq, sql, count } from "drizzle-orm";
import { db, mailboxesTable, messagesTable } from "@workspace/db";
import {
  GetMailboxParams,
  DeleteMailboxParams,
  CreateMailboxBody,
  ListMailboxesResponse,
  GetMailboxResponse,
  GetStatsResponse,
  ListDomainsResponse,
} from "@workspace/api-zod";
import { generateRandomLocalPart } from "../lib/mailbox-utils";
import { getCloudfareDomains, isValidDomain } from "../lib/cloudflare";

const router: IRouter = Router();

const DEFAULT_DOMAIN = process.env.MAIL_DOMAIN ?? "tokito.me";

async function getMailboxWithCounts(address: string) {
  const [mailbox] = await db
    .select()
    .from(mailboxesTable)
    .where(eq(mailboxesTable.address, address));
  if (!mailbox) return null;

  const [countResult] = await db
    .select({
      total: count(),
      unread: sql<number>`sum(case when is_read = false then 1 else 0 end)::int`,
    })
    .from(messagesTable)
    .where(eq(messagesTable.mailboxAddress, address));

  return {
    ...mailbox,
    messageCount: Number(countResult?.total ?? 0),
    unreadCount: Number(countResult?.unread ?? 0),
  };
}

router.get("/domains", async (_req, res): Promise<void> => {
  const domains = await getCloudfareDomains();
  res.json(ListDomainsResponse.parse({ domains }));
});

router.get("/mailboxes", async (req, res): Promise<void> => {
  const mailboxes = await db.select().from(mailboxesTable).orderBy(mailboxesTable.createdAt);

  const withCounts = await Promise.all(
    mailboxes.map(async (mb) => {
      const [countResult] = await db
        .select({
          total: count(),
          unread: sql<number>`sum(case when is_read = false then 1 else 0 end)::int`,
        })
        .from(messagesTable)
        .where(eq(messagesTable.mailboxAddress, mb.address));
      return {
        ...mb,
        messageCount: Number(countResult?.total ?? 0),
        unreadCount: Number(countResult?.unread ?? 0),
      };
    }),
  );

  res.json(ListMailboxesResponse.parse({ mailboxes: withCounts, total: withCounts.length }));
});

router.post("/mailboxes/generate", async (req, res): Promise<void> => {
  const localPart = generateRandomLocalPart();
  const body = req.body as { domain?: string } | undefined;
  let domain = body?.domain ?? DEFAULT_DOMAIN;

  if (domain !== DEFAULT_DOMAIN) {
    const valid = await isValidDomain(domain);
    if (!valid) {
      res.status(400).json({ error: `Domain '${domain}' is not in your Cloudflare account` });
      return;
    }
  }

  const address = `${localPart}@${domain}`;

  const [mailbox] = await db
    .insert(mailboxesTable)
    .values({ address })
    .returning();

  res.status(201).json(GetMailboxResponse.parse({ ...mailbox!, messageCount: 0, unreadCount: 0 }));
});

router.post("/mailboxes", async (req, res): Promise<void> => {
  const parsed = CreateMailboxBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const domain = parsed.data.domain ?? DEFAULT_DOMAIN;

  if (domain !== DEFAULT_DOMAIN) {
    const valid = await isValidDomain(domain);
    if (!valid) {
      res.status(400).json({ error: `Domain '${domain}' is not in your Cloudflare account` });
      return;
    }
  }

  const localPart = parsed.data.localPart ?? generateRandomLocalPart();
  const address = `${localPart}@${domain}`;
  const name = parsed.data.name ?? null;

  const [existing] = await db
    .select()
    .from(mailboxesTable)
    .where(eq(mailboxesTable.address, address));

  if (existing) {
    res.status(409).json({ error: "Address already exists" });
    return;
  }

  const [mailbox] = await db
    .insert(mailboxesTable)
    .values({ address, name })
    .returning();

  res.status(201).json(GetMailboxResponse.parse({ ...mailbox!, messageCount: 0, unreadCount: 0 }));
});

router.get("/mailboxes/:address", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.address) ? req.params.address[0] : req.params.address;
  const params = GetMailboxParams.safeParse({ address: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const mailbox = await getMailboxWithCounts(params.data.address);
  if (!mailbox) {
    res.status(404).json({ error: "Mailbox not found" });
    return;
  }

  res.json(GetMailboxResponse.parse(mailbox));
});

router.delete("/mailboxes/:address", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.address) ? req.params.address[0] : req.params.address;
  const params = DeleteMailboxParams.safeParse({ address: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(mailboxesTable)
    .where(eq(mailboxesTable.address, params.data.address))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Mailbox not found" });
    return;
  }

  await db.delete(messagesTable).where(eq(messagesTable.mailboxAddress, params.data.address));

  res.sendStatus(204);
});

router.get("/stats", async (_req, res): Promise<void> => {
  const domains = await getCloudfareDomains();
  const [mailboxCount] = await db.select({ total: count() }).from(mailboxesTable);
  const [msgCount] = await db.select({
    total: count(),
    unread: sql<number>`sum(case when is_read = false then 1 else 0 end)::int`,
  }).from(messagesTable);

  res.json(GetStatsResponse.parse({
    totalMailboxes: Number(mailboxCount?.total ?? 0),
    totalMessages: Number(msgCount?.total ?? 0),
    totalUnread: Number(msgCount?.unread ?? 0),
    domain: domains[0]?.name ?? DEFAULT_DOMAIN,
  }));
});

export default router;
