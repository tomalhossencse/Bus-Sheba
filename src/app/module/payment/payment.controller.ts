import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";
import { PaymentService } from "./payment.service";

const createPayment = catchAsync(async (req: Request, res: Response) => {
	const result = await PaymentService.createPayment(req.body, req.user);
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

export const PaymentController = {
	createPayment,
	paymentCallback,
};
