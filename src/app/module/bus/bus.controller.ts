import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";

import { RequestUser } from "../../types/types";
import { BusService } from "./bus.service";
import { AppError } from "../../utils/AppError";
import { build } from "tsup";

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

const updateBusWithSeatLayout = catchAsync(
	async (req: Request, res: Response) => {
		const busId = req.params.busId;

		if (!busId) {
			throw new AppError(
				httpStatus.NOT_FOUND,
				"Bus ID is required in the request parameters",
			);
		}

		const result = await BusService.updateBusWithSeatLayout(
			req.body,
			busId as string,
			req.user as RequestUser,
		);

		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Bus updated successfully",
			data: result,
		});
	},
);

const getBusById = catchAsync(async (req: Request, res: Response) => {
	const busId = req.params.busId;

	if (!busId) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Bus ID is required in the request parameters",
		);
	}
	const result = await BusService.getBusById(busId as string);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Bus details fetched successfully",
		data: result,
	});
});

const getAllBuses = catchAsync(async (req: Request, res: Response) => {
	const result = await BusService.getAllBuses(req.query);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Bus list fetched successfully",
		data: result,
	});
});

export const BusController = {
	addBusWithSeatLayout,
	updateBusWithSeatLayout,
	getBusById,
	getAllBuses,
};
