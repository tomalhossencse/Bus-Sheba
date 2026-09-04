import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { auth } from "../../middleware/auth";
import { createTripSchema } from "./trip.validation";
import { TripController } from "./trip.controller";

const router = Router();

router.post(
	"/create",
	auth("OPERATOR"),
	validateRequest(createTripSchema),
	TripController.createTrip,
);

export const TripRoutes = router;
