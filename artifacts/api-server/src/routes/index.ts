import { Router, type IRouter } from "express";
import healthRouter from "./health";
import debugRouter from "./debug";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/debug", debugRouter);

export default router;
