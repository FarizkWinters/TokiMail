import { Router, type IRouter } from "express";
import healthRouter from "./health";
import mailboxesRouter from "./mailboxes";
import messagesRouter from "./messages";
import inboundRouter from "./inbound";
import apiKeysRouter from "./apikeys";
import configRouter from "./config";

const router: IRouter = Router();

router.use(healthRouter);
router.use(configRouter);
router.use(mailboxesRouter);
router.use(messagesRouter);
router.use(inboundRouter);
router.use(apiKeysRouter);

export default router;
