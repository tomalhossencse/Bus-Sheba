import { Router } from "express";
import { auth } from "../../middleware/auth";
import { AnalyticsController } from "./analytics.controller";

const router = Router();

router.get(
	"/admin",
	auth("ADMIN", "SUPER_ADMIN"),
	AnalyticsController.adminAnalytics,
);

router.get(
	"/operator",
	auth("OPERATOR"),
	AnalyticsController.operatorAnalytics,
);

router.get(
	"/passenger",
	auth("PASSENGER"),
	AnalyticsController.passengerAnalytics,
);

export const AnalyticsRoutes = router;
