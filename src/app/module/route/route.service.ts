import httpStatus from "http-status";
import { RouteWhereInput } from "../../../generated/prisma/models";
import { prisma } from "../../lib/prisma";
import { RequestUser } from "../../types/types";
import { AppError } from "../../utils/AppError";
import { AddRoutePayload, UpdateRoutePayload } from "./route.validation";
import { IRouteQuery } from "./route.interface";
import { AddRouteStopPayload } from "../routeStop/routeStop.validation";

const addRoute = async (payload: AddRoutePayload, user: RequestUser) => {
	const isUserExist = await prisma.user.findUnique({
		where: { id: user.id },
	});

	if (!isUserExist) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	const routeExists = await prisma.route.findUnique({
		where: {
			idx_route_source_destination: {
				source: payload.source,
				destination: payload.destination,
				name: payload.name,
			},
		},
	});

	if (routeExists) {
		throw new AppError(httpStatus.CONFLICT, "Route already exists");
	}

	const route = await prisma.route.create({
		data: {
			name: payload.name,
			source: payload.source,
			destination: payload.destination,
			distanceKm: payload.distanceKm,
			estimatedMinutes: payload.estimatedMinutes,
			stops: {
				createMany: {
					data:
						(payload.routeStops?.length
							? payload.routeStops
							: [
									{
										stopName: payload.source,
										arrivalMinutes: 0,
										departureMinutes: 0,
									},
									{
										stopName: payload.destination,
										arrivalMinutes: payload.estimatedMinutes,
										departureMinutes: payload.estimatedMinutes,
									},
								]
						).map((stop, index, stops) => ({
							stopName:
								index === 0
									? payload.source
									: index === stops.length - 1
										? payload.destination
										: stop.stopName,
							stopOrder: index + 1,
							arrivalMinutes: stop.arrivalMinutes,
							departureMinutes: stop.departureMinutes,
						})) || [],
				},
			},
		},
		include: {
			stops: true,
		},
	});

	return route;
};

const updateRoute = async (
	payload: UpdateRoutePayload,
	routeId: string,
	user: RequestUser,
) => {
	const isUserExist = await prisma.user.findUnique({
		where: { id: user.id },
	});

	if (!isUserExist) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	const routeExists = await prisma.route.findUnique({
		where: { id: routeId },
		include: { trips: true },
	});

	if (!routeExists) {
		throw new AppError(httpStatus.NOT_FOUND, "Route not found");
	}

	if (routeExists.trips.length > 0) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Cannot update route with existing trips. Please delete the trips first.",
		);
	}

	const route = await prisma.route.update({
		where: { id: routeId },
		data: {
			name: payload.name ?? routeExists.name,
			source: payload.source ?? routeExists.source,
			destination: payload.destination ?? routeExists.destination,
			distanceKm: payload.distanceKm ?? routeExists.distanceKm,
			estimatedMinutes:
				payload.estimatedMinutes ?? routeExists.estimatedMinutes,
			updatedAt: new Date(),
		},
		include: {
			stops: true,
		},
	});

	return route;
};

const deleteRoute = async (routeId: string, user: RequestUser) => {
	const isUserExist = await prisma.user.findUnique({
		where: { id: user.id },
	});

	if (!isUserExist) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	const routeExists = await prisma.route.findUnique({
		where: { id: routeId },
		include: { trips: true },
	});

	if (!routeExists) {
		throw new AppError(httpStatus.NOT_FOUND, "Route not found");
	}

	if (!routeExists.isActive) {
		throw new AppError(httpStatus.BAD_REQUEST, "Route is already deactivated");
	}

	const route = await prisma.route.update({
		where: { id: routeId },
		data: {
			isActive: false,
			updatedAt: new Date(),
		},
	});

	return route;
};

const activateRoute = async (routeId: string, user: RequestUser) => {
	const isUserExist = await prisma.user.findUnique({
		where: { id: user.id },
	});

	if (!isUserExist) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	const routeExists = await prisma.route.findUnique({
		where: { id: routeId },
	});

	if (!routeExists) {
		throw new AppError(httpStatus.NOT_FOUND, "Route not found");
	}

	if (routeExists.isActive) {
		throw new AppError(httpStatus.BAD_REQUEST, "Route is already Activated");
	}

	const route = await prisma.route.update({
		where: { id: routeId },
		data: {
			isActive: true,
			updatedAt: new Date(),
		},
	});

	return route;
};

const getRouteById = async (routeId: string) => {
	const route = await prisma.route.findUnique({
		where: { id: routeId },
		include: {
			stops: {
				where: { isDeleted: false },
				orderBy: { stopOrder: "asc" },
			},
			trips: {
				where: {
					arrivalTime: {
						gt: new Date(),
					},
				},
			},
		},
	});

	if (!route) {
		throw new AppError(httpStatus.NOT_FOUND, "Route not found");
	}

	return route;
};

const getAllRoutes = async (query: IRouteQuery) => {
	const limit = query.limit ? Number(query.limit) : 5;
	const page = query.page ? Number(query.page) : 1;
	const skip = (page - 1) * limit;
	const sortBy = query.sortBy ? query.sortBy : "createdAt";
	const sortOrder = query.sortOrder ? query.sortOrder : "desc";

	const andConditions: RouteWhereInput[] = [];

	if (query.searchTerm) {
		andConditions.push({
			OR: [
				{
					name: {
						contains: query.searchTerm,
						mode: "insensitive",
					},
				},
				{
					source: {
						contains: query.searchTerm,
						mode: "insensitive",
					},
				},
				{
					destination: {
						contains: query.searchTerm,
						mode: "insensitive",
					},
				},
			],
		});
	}

	if (query.source) {
		andConditions.push({
			source: {
				contains: query.source,
				mode: "insensitive",
			},
		});
	}

	if (query.destination) {
		andConditions.push({
			destination: {
				contains: query.destination,
				mode: "insensitive",
			},
		});
	}

	if (query.isActive !== undefined) {
		andConditions.push({
			isActive: query.isActive,
		});
	}

	if (query.minDistance) {
		andConditions.push({
			distanceKm: {
				gte: query.minDistance,
			},
		});
	}

	if (query.maxDistance) {
		andConditions.push({
			distanceKm: {
				lte: query.maxDistance,
			},
		});
	}

	const routes = await prisma.route.findMany({
		where: {
			AND: andConditions,
		},
		take: limit,
		skip: skip,
		orderBy: {
			[sortBy]: sortOrder,
		},
		include: {
			stops: {
				where: { isDeleted: false },
				orderBy: { stopOrder: "asc" },
			},
			trips: {
				where: {
					arrivalTime: {
						gt: new Date(),
					},
				},
			},
			_count: {
				select: { trips: true },
			},
		},
	});

	const totalRouteCount = await prisma.route.count({
		where: {
			AND: andConditions,
		},
	});

	return {
		data: routes,
		meta: {
			limit,
			page,
			total: totalRouteCount,
			totalPages: Math.ceil(totalRouteCount / limit),
		},
	};
};

const searchRoutes = async (source: string, destination: string) => {
	const routes = await prisma.route.findMany({
		where: {
			source: {
				contains: source,
				mode: "insensitive",
			},
			destination: {
				contains: destination,
				mode: "insensitive",
			},
			isActive: true,
		},
		include: {
			stops: {
				where: { isDeleted: false },
				orderBy: { stopOrder: "asc" },
			},
			trips: {
				where: {
					arrivalTime: {
						gt: new Date(),
					},
				},
				include: {
					bus: true,
				},
			},
		},
	});

	return routes;
};

export const RouteService = {
	addRoute,
	updateRoute,
	deleteRoute,
	activateRoute,
	getRouteById,
	getAllRoutes,
	searchRoutes,
};
