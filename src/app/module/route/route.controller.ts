import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";
import { RouteService } from "./route.service";
import { RequestUser } from "../../types/types";

const addRoute = catchAsync(async (req: Request, res: Response) => {
	const result = await RouteService.addRoute(req.body, req.user as RequestUser);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Apply for operator successfully",
		data: result,
	});
});

export const RouteController = { addRoute };
