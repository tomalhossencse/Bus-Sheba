import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { auth } from "../../middleware/auth";
import { PaymentController } from "./payment.controller";
import { createPaymentSchema } from "./payment.valudation";

const router = Router();

router.post(
	"/create",
	auth("PASSENGER"),
	validateRequest(createPaymentSchema),
	PaymentController.createPayment,
);

router.get("/callback", PaymentController.paymentCallback);

// passenger
router.get("/my", auth("PASSENGER"), PaymentController.getMyPayments);

// admin
router.get("/", auth("ADMIN", "SUPER_ADMIN"), PaymentController.getAllPayments);

// admin and passenger
router.get(
	"/:paymentId",
	auth("PASSENGER", "ADMIN", "SUPER_ADMIN"),
	PaymentController.getPaymentById,
);

export const PaymentRoutes = router;
