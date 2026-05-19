import { Router, type IRouter } from "express";
import healthRouter from "./health";
import fleetRouter from "./fleet";
import reservationsRouter from "./reservations";
import sosRouter from "./sos";
import configRouter from "./config";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(fleetRouter);
router.use(reservationsRouter);
router.use(sosRouter);
router.use(configRouter);
router.use(statsRouter);

export default router;
