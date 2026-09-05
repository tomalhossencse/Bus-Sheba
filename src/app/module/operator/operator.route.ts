import { Router } from "express";
import {
	validateRequest,
	validateRequestForForm,
} from "../../middleware/validateRequest";
import {
	applyAsOperatorSchema,
	approveOperatorValidationSchema,
	operatorUpdateSchema,
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
	auth("ADMIN", "SUPER_ADMIN"),
	validateRequest(approveOperatorValidationSchema),
	OperatorController.approveOperator,
);

router.put(
	"/update",
	auth("OPERATOR"),
	validateRequest(operatorUpdateSchema),
	OperatorController.updateOperator,
);

router.get(
	"/",
	auth("ADMIN", "SUPER_ADMIN"),
	OperatorController.getAllOperators,
);

export const OperatorRoutes = router;
