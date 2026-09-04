import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { auth } from "../../middleware/auth";
import { BookingController } from "./booking.controller";
import { createBookingSchema } from "./booking.validation";

const router = Router();

router.post(
	"/create",
	auth("PASSENGER"),
	validateRequest(createBookingSchema),
	BookingController.createBooking,
);

export const BookingRoutes = router;
