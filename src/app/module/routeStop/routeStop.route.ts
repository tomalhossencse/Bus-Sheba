import { Router } from "express";
import {
	validateRequest,
	validateRequestForArray,
} from "../../middleware/validateRequest";
import { auth } from "../../middleware/auth";
import { RouteStopController } from "./routeStop.controller";
import {
	addManyRouteStopSchema,
	addRouteStopSchema,
	updateRouteStopSchema,
} from "./routeStop.validation";

const router = Router();

router.post(
	"/add",
	auth("ADMIN", "SUPER_ADMIN"),
	validateRequest(addRouteStopSchema),
	RouteStopController.addRouteStop,
);

router.post(
	"/add-many",
	auth("ADMIN", "SUPER_ADMIN"),
	validateRequestForArray(addManyRouteStopSchema),
	RouteStopController.addManyRouteStop,
);

router.put(
	"/update/:stopId",
	auth("ADMIN", "SUPER_ADMIN"),
	validateRequest(updateRouteStopSchema),
	RouteStopController.updateRouteStop,
);

router.patch(
	"/deactivate/:stopId",
	auth("ADMIN", "SUPER_ADMIN"),
	RouteStopController.deleteRouteStop,
);

router.patch(
	"/activate/:stopId",
	auth("ADMIN", "SUPER_ADMIN"),
	RouteStopController.activateRouteStop,
);

// public
router.get("/", RouteStopController.getAllStops);
router.get("/route/:routeId", RouteStopController.getStopsByRoute);
router.get("/:stopId", RouteStopController.getStopById);

export const RouteStopRoutes = router;
