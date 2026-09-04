import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { auth } from "../../middleware/auth";
import { RouteController } from "./route.controller";
import { addRouteSchema } from "./route.validation";

const router = Router();

router.post(
	"/add",
	auth("ADMIN", "SUPER_ADMIN"),
	validateRequest(addRouteSchema),
	RouteController.addRoute,
);

export const RouteRoutes = router;
