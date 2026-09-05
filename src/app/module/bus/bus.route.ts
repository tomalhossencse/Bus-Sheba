import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { BusController } from "./bus.controller";
import { addBusSchema, updateBusSchema } from "./bus.validation";
import { auth } from "../../middleware/auth";

const router = Router();

router.post(
	"/add",
	auth("OPERATOR"),
	validateRequest(addBusSchema),
	BusController.addBusWithSeatLayout,
);

router.put(
	"/update/:busId",
	auth("OPERATOR"),
	validateRequest(updateBusSchema),
	BusController.updateBusWithSeatLayout,
);

// public
router.get("/", BusController.getAllBuses);
router.get("/:busId", BusController.getBusById);

export const BusRoutes = router;
