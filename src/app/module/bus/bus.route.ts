import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { BusController } from "./bus.controller";
import { addBusSchema } from "./bus.validation";
import { auth } from "../../middleware/auth";

const router = Router();

router.post(
	"/add",
	auth("OPERATOR"),
	validateRequest(addBusSchema),
	BusController.addBus,
);

export const BusRoutes = router;
