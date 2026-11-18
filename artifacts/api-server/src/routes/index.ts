import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import marketplaceRouter from "./marketplace";
import organiserRouter from "./organiser";
import adminRouter from "./admin";
import ticketsRouter from "./tickets";
import checkoutRouter from "./checkout";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(marketplaceRouter);
router.use(organiserRouter);
router.use(adminRouter);
router.use(ticketsRouter);
router.use(checkoutRouter);

export default router;
