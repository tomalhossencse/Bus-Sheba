import { Router } from "express";
import { auth } from "../../middleware/auth";
import { AuthController } from "./auth.controller";
import {
	validateRequest,
	validateRequestForForm,
	validateRequestForArray,
} from "../../middleware/validateRequest";
import {
	ChangePasswordZodSchema,
	ForgetPasswordZodSchema,
	GoogleLoginZodSchema,
	LoginZodSchema,
	PassengerRegistrationZodSchema,
	PassengerVerifyZodSchema,
	ResetPasswordZodSchema,
	UpdateProfileZodSchema,
} from "./auth.validation";
import { upload } from "../../lib/multer";

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

router.post(
	"/google",
	validateRequest(GoogleLoginZodSchema),
	AuthController.googleLogin,
);
router.post(
	"/forget-password",
	validateRequest(ForgetPasswordZodSchema),
	AuthController.forgetPassword,
);
router.post(
	"/reset-password",
	validateRequest(ResetPasswordZodSchema),
	AuthController.resetPassword,
);
router.post(
	"/change-password",
	auth(),
	validateRequest(ChangePasswordZodSchema),
	AuthController.changePassword,
);
router.put(
	"/update-profile",
	auth(),
	upload.single("image"),
	validateRequestForForm(UpdateProfileZodSchema),
	AuthController.updateProfile,
);

router.get("/me", auth(), AuthController.getMe);

router.post("/refresh-token", AuthController.refreshToken);

export const AuthRoutes = router;
