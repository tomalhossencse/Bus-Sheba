import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";
import { RequestUser } from "../../types/types";
import { BookingService } from "./booking.service";

const createBooking = catchAsync(async (req: Request, res: Response) => {
	const result = await BookingService.createBooking(
		req.body,
		req.user as RequestUser,
	);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "New booking created successfully",
		data: result,
	});
});

export const BookingController = { createBooking };
