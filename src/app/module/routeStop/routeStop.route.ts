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

export const RouteStopRoutes = router;
