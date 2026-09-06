import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";
import { OperatorService } from "./operator.service";

const applyAsOperator = catchAsync(async (req: Request, res: Response) => {
	const files = req.files as { [fieldname: string]: Express.Multer.File[] };

	const nidDocument = files?.["nidDocument"] ? files?.["nidDocument"][0] : null;

	const tradeLicenseDocument = files?.["tradeLicenseDocument"]
		? files?.["tradeLicenseDocument"][0]
		: null;

	const additionalDocuments = files?.["additionalDocuments"] || [];

	const result = await OperatorService.applyAsOperator(
		req.body,
		nidDocument,
		tradeLicenseDocument,
		additionalDocuments,
	);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Apply for operator successfully and Please verify your email.",
		data: result,
	});
});

const verifyOperator = catchAsync(async (req: Request, res: Response) => {
	const result = await OperatorService.verifyOperator(req.body);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message:
			"Operator email verified successfully and please wait for admin approval.",
		data: result,
	});
});

const approveOperator = catchAsync(async (req: Request, res: Response) => {
	const user = req.user;
	const result = await OperatorService.approveOperator(req.body, user);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: `Operator ${result.verificationStatus} successfully.`,
		data: result,
	});
});

const updateOperator = catchAsync(async (req: Request, res: Response) => {
	const user = req.user;
	const result = await OperatorService.updateOperator(req.body, user);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: `Operator updated successfully.`,
		data: result,
	});
});

const getAllOperators = catchAsync(async (req: Request, res: Response) => {
	const query = req.query;
	const result = await OperatorService.getAllOperators(query);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Operators retrieved successfully.",
		data: result,
	});
});

export const OperatorController = {
	applyAsOperator,
	verifyOperator,
	approveOperator,
	updateOperator,
	getAllOperators,
};
