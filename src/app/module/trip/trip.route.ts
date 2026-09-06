import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { auth } from "../../middleware/auth";
import {
	changeTripStatusSchema,
	createTripSchema,
	updateTripSchema,
} from "./trip.validation";
import { TripController } from "./trip.controller";

const router = Router();

// operator
router.post(
	"/create",
	auth("OPERATOR"),
	validateRequest(createTripSchema),
	TripController.createTrip,
);

router.put(
	"/update/:tripId",
	auth("OPERATOR"),
	validateRequest(updateTripSchema),
	TripController.updateTrip,
);

router.patch("/cancel/:tripId", auth("OPERATOR"), TripController.cancelTrip);

router.patch(
	"/status/:tripId",
	auth("OPERATOR", "ADMIN", "SUPER_ADMIN"),
	validateRequest(changeTripStatusSchema),
	TripController.changeTripStatus,
);

router.get("/my-trips", auth("OPERATOR"), TripController.getMyTrips);

// public
router.get("/search", TripController.searchTrips);

router.get("/", TripController.getAllTrips);

router.get("/:tripId/seats", TripController.getTripSeats);

router.get("/:tripId/available-seats", TripController.getAvailableSeats);

router.get("/:tripId", TripController.getTripById);

export const TripRoutes = router;
