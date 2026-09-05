import { Router } from "express";
import {
	validateRequest,
	validateRequestForForm,
} from "../../middleware/validateRequest";
import {
	applyAsOperatorSchema,
	approveOperatorValidationSchema,
	operatorVerifyZodSchema,
} from "./operator.validation";
import { OperatorController } from "./operator.controller";
import { upload } from "../../lib/multer";
import { auth } from "../../middleware/auth";

const router = Router();

router.post(
	"/apply",
	upload.fields([
		{ name: "nidDocument", maxCount: 1 },
		{ name: "tradeLicenseDocument", maxCount: 1 },
		{ name: "additionalDocuments", maxCount: 3 },
	]),
	validateRequestForForm(applyAsOperatorSchema),
	OperatorController.applyAsOperator,
);

router.post(
	"/verify-email",
	validateRequest(operatorVerifyZodSchema),
	OperatorController.verifyOperator,
);

router.patch(
	"/approve",
	validateRequest(approveOperatorValidationSchema),
	auth("ADMIN", "SUPER_ADMIN"),
	OperatorController.approveOperator,
);

export const OperatorRoutes = router;
