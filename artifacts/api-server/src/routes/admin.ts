import { Router } from "express";

const router = Router();

router.post("/login", (req, res) => {
  const adminPassword = process.env["ADMIN_PASSWORD"];

  if (!adminPassword) {
    res.status(503).json({ error: "Admin access not configured on this server" });
    return;
  }

  const { password } = req.body as { password?: string };

  if (!password || password !== adminPassword) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }

  res.json({ ok: true });
});

export default router;
