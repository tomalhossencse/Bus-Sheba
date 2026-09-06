import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";
import { RequestUser } from "../../types/types";
import { getAdminAnalytics } from "./analytics.service";
import { getOperatorAnalytics } from "./analytics.service";
import { getPassengerAnalytics } from "./analytics.service";

const adminAnalytics = catchAsync(async (req: Request, res: Response) => {
	const result = await getAdminAnalytics();

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Admin analytics fetched successfully",
		data: result,
	});
});

const operatorAnalytics = catchAsync(async (req: Request, res: Response) => {
	const result = await getOperatorAnalytics(req.user as RequestUser);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Operator analytics fetched successfully",
		data: result,
	});
});

const passengerAnalytics = catchAsync(async (req: Request, res: Response) => {
	const result = await getPassengerAnalytics(req.user as RequestUser);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Passenger analytics fetched successfully",
		data: result,
	});
});

export const AnalyticsController = {
	adminAnalytics,
	operatorAnalytics,
	passengerAnalytics,
};
