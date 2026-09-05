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

export const PaymentRoutes = router;
