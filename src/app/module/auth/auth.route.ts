import { Router } from "express";
import { auth } from "../../middleware/auth";
import { AuthController } from "./auth.controller";
import { validateRequest } from "../../middleware/validateRequest";
import {
	LoginZodSchema,
	PassengerRegistrationZodSchema,
	PassengerVerifyZodSchema,
} from "./auth.validation";

const router = Router();

router.post(
	"/register",
	validateRequest(PassengerRegistrationZodSchema),
	AuthController.registerPassenger,
);
router.post(
	"/verify-email",
	validateRequest(PassengerVerifyZodSchema),
	AuthController.verifyPassenger,
);

router.post(
	"/login",
	validateRequest(LoginZodSchema),
	AuthController.loginUser,
);
router.get("/me", auth(), AuthController.getMe);
router.post("/refresh-token", AuthController.refreshToken);
export const AuthRoutes = router;
