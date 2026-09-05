import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { auth } from "../../middleware/auth";
import { RouteController } from "./route.controller";
import { addRouteSchema, updateRouteSchema } from "./route.validation";

const router = Router();

router.post(
	"/add",
	auth("ADMIN", "SUPER_ADMIN"),
	validateRequest(addRouteSchema),
	RouteController.addRoute,
);

router.put(
	"/update/:routeId",
	auth("ADMIN", "SUPER_ADMIN"),
	validateRequest(updateRouteSchema),
	RouteController.updateRoute,
);

router.patch(
	"/deactivate/:routeId",
	auth("ADMIN", "SUPER_ADMIN"),
	RouteController.deleteRoute,
);

router.patch(
	"/activate/:routeId",
	auth("ADMIN", "SUPER_ADMIN"),
	RouteController.activateRoute,
);

// public
router.get("/", RouteController.getAllRoutes);
router.get("/search/:source/:destination", RouteController.searchRoutes);
router.get("/:routeId", RouteController.getRouteById);

export const RouteRoutes = router;
