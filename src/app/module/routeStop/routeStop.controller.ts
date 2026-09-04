import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";
import { RequestUser } from "../../types/types";
import { RouteStopService } from "./routeStop.serivce";

const addRouteStop = catchAsync(async (req: Request, res: Response) => {
	const result = await RouteStopService.addRouteStop(
		req.body,
		req.user as RequestUser,
	);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Route stop added successfully",
		data: result,
	});
});

const addManyRouteStop = catchAsync(async (req: Request, res: Response) => {
	const result = await RouteStopService.addManyRouteStop(
		req.body,
		req.user as RequestUser,
	);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Route stops added successfully",
		data: result,
	});
});

export const RouteStopController = { addRouteStop, addManyRouteStop };
