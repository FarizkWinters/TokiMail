import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, apiKeysTable } from "@workspace/db";
import { CreateApiKeyBody, DeleteApiKeyParams, ListApiKeysResponse } from "@workspace/api-zod";
import crypto from "crypto";

const router: IRouter = Router();

function generateApiKey(): { key: string; prefix: string; hash: string } {
  const raw = `tmk_${crypto.randomBytes(32).toString("hex")}`;
  const prefix = raw.substring(0, 12);
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { key: raw, prefix, hash };
}

router.get("/keys", async (_req, res): Promise<void> => {
  const keys = await db
    .select({
      id: apiKeysTable.id,
      name: apiKeysTable.name,
      keyPrefix: apiKeysTable.keyPrefix,
      createdAt: apiKeysTable.createdAt,
      lastUsedAt: apiKeysTable.lastUsedAt,
    })
    .from(apiKeysTable)
    .orderBy(apiKeysTable.createdAt);

  res.json(ListApiKeysResponse.parse({ keys }));
});

router.post("/keys", async (req, res): Promise<void> => {
  const parsed = CreateApiKeyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { key, prefix, hash } = generateApiKey();

  const [apiKey] = await db
    .insert(apiKeysTable)
    .values({
      name: parsed.data.name,
      keyHash: hash,
      keyPrefix: prefix,
    })
    .returning();

  res.status(201).json({
    id: apiKey!.id,
    name: apiKey!.name,
    keyPrefix: apiKey!.keyPrefix,
    key,
    createdAt: apiKey!.createdAt,
  });
});

router.delete("/keys/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteApiKeyParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(apiKeysTable)
    .where(eq(apiKeysTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "API key not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
