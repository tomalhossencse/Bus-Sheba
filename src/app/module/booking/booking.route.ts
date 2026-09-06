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

// passenger
router.get("/my", auth("PASSENGER"), BookingController.getMyBookings);

// admin
router.get("/", auth("ADMIN", "SUPER_ADMIN"), BookingController.getAllBookings);

// admin and passenger
router.get(
	"/:bookingId",
	auth("PASSENGER", "ADMIN", "SUPER_ADMIN"),
	BookingController.getBookingById,
);

export const BookingRoutes = router;
