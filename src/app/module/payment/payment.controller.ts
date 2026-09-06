import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError";
import { RequestUser } from "../../types/types";
import { PaymentService } from "./payment.service";
import { IGetPaymentsQuery } from "./payment.interface";

const createPayment = catchAsync(async (req: Request, res: Response) => {
	const result = await PaymentService.createPayment(
		req.body,
		req.user as RequestUser,
	);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Payment initialized successfully",
		data: result,
	});
});

const paymentCallback = catchAsync(async (req: Request, res: Response) => {
	const { redirectUrl } = await PaymentService.paymentCallback(req.query);
	res.redirect(redirectUrl);
});

const getAllPayments = catchAsync(async (req: Request, res: Response) => {
	const result = await PaymentService.getAllPayments(
		req.query as IGetPaymentsQuery,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "All payments fetched successfully",
		meta: result.meta,
		data: result.data,
	});
});

const getMyPayments = catchAsync(async (req: Request, res: Response) => {
	const result = await PaymentService.getMyPayments(
		req.query as IGetPaymentsQuery,
		req.user as RequestUser,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "My payments fetched successfully",
		meta: result.meta,
		data: result.data,
	});
});

const getPaymentById = catchAsync(async (req: Request, res: Response) => {
	const { paymentId } = req.params;

	if (!paymentId) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Payment ID is required in the request parameters",
		);
	}

	const result = await PaymentService.getPaymentById(
		paymentId as string,
		req.user as RequestUser,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Payment details fetched successfully",
		data: result,
	});
});

export const PaymentController = {
	createPayment,
	paymentCallback,
	getAllPayments,
	getMyPayments,
	getPaymentById,
};
