import { Router, type IRouter } from "express";
import healthRouter from "./health";
import mailboxesRouter from "./mailboxes";
import messagesRouter from "./messages";
import inboundRouter from "./inbound";
import apiKeysRouter from "./apikeys";

const router: IRouter = Router();

router.use(healthRouter);
router.use(mailboxesRouter);
router.use(messagesRouter);
router.use(inboundRouter);
router.use(apiKeysRouter);

export default router;
