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

router.patch(
	"/deactivate/:busId",
	auth("OPERATOR"),
	BusController.deactivateBus,
);

router.patch("/activate/:busId", auth("OPERATOR"), BusController.activateBus);

router.patch(
	"/maintenance/:busId",
	auth("OPERATOR"),
	BusController.maintenanceBus,
);

// private
router.get("/my-buses", auth("OPERATOR"), BusController.getMyBuses);

// public
router.get("/", BusController.getAllBuses);
router.get("/operator/:operatorId", BusController.getBusesByOperator);
router.get("/:busId/seats", BusController.getBusSeats);
router.get("/:busId", BusController.getBusById);

export const BusRoutes = router;