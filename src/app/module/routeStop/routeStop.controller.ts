import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError";
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

const getStopsByRoute = catchAsync(async (req: Request, res: Response) => {
	const routeId = req.params.routeId;

	if (!routeId) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Route ID is required in the request parameters",
		);
	}

	const result = await RouteStopService.getStopsByRoute(routeId as string);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Route stops fetched successfully",
		data: result,
	});
});

const getAllStops = catchAsync(async (req: Request, res: Response) => {
	const result = await RouteStopService.getAllStops(req.query);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Route stops list fetched successfully",
		data: result,
	});
});

const getStopById = catchAsync(async (req: Request, res: Response) => {
	const stopId = req.params.stopId;

	if (!stopId) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Stop ID is required in the request parameters",
		);
	}

	const result = await RouteStopService.getStopById(stopId as string);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Route stop details fetched successfully",
		data: result,
	});
});

const updateRouteStop = catchAsync(async (req: Request, res: Response) => {
	const stopId = req.params.stopId;

	if (!stopId) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Stop ID is required in the request parameters",
		);
	}

	const result = await RouteStopService.updateRouteStop(
		req.body,
		stopId as string,
		req.user as RequestUser,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Route stop updated successfully",
		data: result,
	});
});

const deleteRouteStop = catchAsync(async (req: Request, res: Response) => {
	const stopId = req.params.stopId;

	if (!stopId) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Stop ID is required in the request parameters",
		);
	}

	const result = await RouteStopService.deleteRouteStop(
		stopId as string,
		req.user as RequestUser,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Route stop deactivated successfully",
		data: result,
	});
});

const activateRouteStop = catchAsync(async (req: Request, res: Response) => {
	const stopId = req.params.stopId;

	if (!stopId) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Stop ID is required in the request parameters",
		);
	}

	const result = await RouteStopService.activateRouteStop(
		stopId as string,
		req.user as RequestUser,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Route stop activated successfully",
		data: result,
	});
});

export const RouteStopController = {
	addRouteStop,
	addManyRouteStop,
	getStopsByRoute,
	getAllStops,
	getStopById,
	updateRouteStop,
	deleteRouteStop,
	activateRouteStop,
};
