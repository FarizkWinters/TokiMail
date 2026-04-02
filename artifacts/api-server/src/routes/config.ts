import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/config", (_req, res): void => {
  res.json({
    appName: process.env.APP_NAME || "TokiMail",
    appTagline: process.env.APP_TAGLINE || "Disposable email. Instant. Private.",
    version: "0.1.0",
  });
});

export default router;
