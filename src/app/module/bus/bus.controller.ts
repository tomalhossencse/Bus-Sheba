import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";

import { RequestUser } from "../../types/types";
import { BusService } from "./bus.service";

const addBusWithSeatLayout = catchAsync(async (req: Request, res: Response) => {
	const result = await BusService.addBusWithSeatLayout(
		req.body,
		req.user as RequestUser,
	);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "New bus added successfully",
		data: result,
	});
});

export const BusController = {
	addBusWithSeatLayout,
};
