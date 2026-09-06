import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError";
import { RequestUser } from "../../types/types";
import { TripService } from "./trip.service";
import { ITripQuery } from "./trip.interface";

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

const updateTrip = catchAsync(async (req: Request, res: Response) => {
	const { tripId } = req.params;

	if (!tripId) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Trip ID is required in the request parameters",
		);
	}

	const result = await TripService.updateTrip(
		req.body,
		tripId as string,
		req.user as RequestUser,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Trip updated successfully",
		data: result,
	});
});

const cancelTrip = catchAsync(async (req: Request, res: Response) => {
	const { tripId } = req.params;

	if (!tripId) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Trip ID is required in the request parameters",
		);
	}

	const result = await TripService.cancelTrip(
		tripId as string,
		req.user as RequestUser,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Trip cancelled successfully",
		data: result,
	});
});

const changeTripStatus = catchAsync(async (req: Request, res: Response) => {
	const { tripId } = req.params;

	if (!tripId) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Trip ID is required in the request parameters",
		);
	}

	const result = await TripService.changeTripStatus(
		req.body.status,
		tripId as string,
		req.user as RequestUser,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Trip status updated successfully",
		data: result,
	});
});

const getTripById = catchAsync(async (req: Request, res: Response) => {
	const { tripId } = req.params;

	if (!tripId) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Trip ID is required in the request parameters",
		);
	}

	const result = await TripService.getTripById(tripId as string);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Trip details fetched successfully",
		data: result,
	});
});

const getTripSeats = catchAsync(async (req: Request, res: Response) => {
	const { tripId } = req.params;

	if (!tripId) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Trip ID is required in the request parameters",
		);
	}

	const result = await TripService.getTripSeats(tripId as string, req.query);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Trip seats fetched successfully",
		data: result,
	});
});

const searchTrips = catchAsync(async (req: Request, res: Response) => {
	const { source, destination, travelDate } = req.query;

	if (!source || !destination) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Source and destination are required",
		);
	}

	const result = await TripService.searchTrips({
		source: source as string,
		destination: destination as string,
		travelDate: travelDate as string | undefined,
	} as ITripQuery);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Available trips fetched successfully",
		data: result,
	});
});

const getAvailableSeats = catchAsync(async (req: Request, res: Response) => {
	const { tripId } = req.params;

	if (!tripId) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Trip ID is required in the request parameters",
		);
	}

	const result = await TripService.getAvailableSeats(tripId as string);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Available seats fetched successfully",
		data: result,
	});
});

const getMyTrips = catchAsync(async (req: Request, res: Response) => {
	const result = await TripService.getMyTrips(
		req.user as RequestUser,
		req.query as ITripQuery,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "My trips fetched successfully",
		meta: result.meta,
		data: result.data,
	});
});

const getAllTrips = catchAsync(async (req: Request, res: Response) => {
	const result = await TripService.getAllTrips(req.query as ITripQuery);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "All trips fetched successfully",
		meta: result.meta,
		data: result.data,
	});
});

export const TripController = {
	createTrip,
	updateTrip,
	cancelTrip,
	changeTripStatus,
	getTripById,
	getTripSeats,
	searchTrips,
	getAvailableSeats,
	getMyTrips,
	getAllTrips,
};
