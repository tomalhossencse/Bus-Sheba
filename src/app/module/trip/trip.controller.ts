import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";
import { RequestUser } from "../../types/types";
import { TripService } from "./trip.service";

const createTrip = catchAsync(async (req: Request, res: Response) => {
	const result = await TripService.createTrip(
		req.body,
		req.user as RequestUser,
	);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Trip created successfully",
		data: result,
	});
});

export const TripController = { createTrip };
