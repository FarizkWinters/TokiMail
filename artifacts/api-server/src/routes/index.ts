import { Router, type IRouter } from "express";
import healthRouter from "./health";
import mailboxesRouter from "./mailboxes";
import messagesRouter from "./messages";
import inboundRouter from "./inbound";
import apiKeysRouter from "./apikeys";
import configRouter from "./config";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(configRouter);
router.use(mailboxesRouter);
router.use(messagesRouter);
router.use(inboundRouter);
router.use(apiKeysRouter);
router.use("/admin", adminRouter);

export default router;
