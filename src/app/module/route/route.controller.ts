import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError";
import { RouteService } from "./route.service";
import { RequestUser } from "../../types/types";

const addRoute = catchAsync(async (req: Request, res: Response) => {
	const result = await RouteService.addRoute(req.body, req.user as RequestUser);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "New route added successfully",
		data: result,
	});
});

const updateRoute = catchAsync(async (req: Request, res: Response) => {
	const routeId = req.params.routeId;

	if (!routeId) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Route ID is required in the request parameters",
		);
	}

	const result = await RouteService.updateRoute(
		req.body,
		routeId as string,
		req.user as RequestUser,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Route updated successfully",
		data: result,
	});
});

const deleteRoute = catchAsync(async (req: Request, res: Response) => {
	const routeId = req.params.routeId;

	if (!routeId) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Route ID is required in the request parameters",
		);
	}

	const result = await RouteService.deleteRoute(
		routeId as string,
		req.user as RequestUser,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Route deactivated successfully",
		data: result,
	});
});

const activateRoute = catchAsync(async (req: Request, res: Response) => {
	const routeId = req.params.routeId;

	if (!routeId) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Route ID is required in the request parameters",
		);
	}

	const result = await RouteService.activateRoute(
		routeId as string,
		req.user as RequestUser,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Route activated successfully",
		data: result,
	});
});

const getRouteById = catchAsync(async (req: Request, res: Response) => {
	const routeId = req.params.routeId;

	if (!routeId) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Route ID is required in the request parameters",
		);
	}

	const result = await RouteService.getRouteById(routeId as string);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Route details fetched successfully",
		data: result,
	});
});

const getAllRoutes = catchAsync(async (req: Request, res: Response) => {
	const result = await RouteService.getAllRoutes(req.query);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Route list fetched successfully",
		data: result,
	});
});

const searchRoutes = catchAsync(async (req: Request, res: Response) => {
	const { source, destination } = req.params;

	if (!source || !destination) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Source and destination are required",
		);
	}

	const result = await RouteService.searchRoutes(
		source as string,
		destination as string,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: `Routes from ${source} to ${destination} fetched successfully`,
		data: result,
	});
});

export const RouteController = {
	addRoute,
	updateRoute,
	deleteRoute,
	activateRoute,
	getRouteById,
	getAllRoutes,
	searchRoutes,
};
