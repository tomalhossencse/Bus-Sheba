import { prisma } from "../../lib/prisma";
import { RequestUser } from "../../types/types";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";
import { RouteStopWhereInput } from "../../../generated/prisma/models";
import {
	AddManyRouteStopPayload,
	AddRouteStopPayload,
	UpdateRouteStopPayload,
} from "./routeStop.validation";
import { IRouteStopQuery } from "./routeStop.interface";
import { Trip } from "../../../generated/prisma/client";

const addRouteStop = async (
	payload: AddRouteStopPayload,
	user: RequestUser,
) => {
	const isUserExist = await prisma.user.findUnique({
		where: { id: user.id },
	});

	if (!isUserExist) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	const isRouteExist = (await prisma.route.findUnique({
		where: { id: payload.routeId },
	})) as { estimatedMinutes: number } | null;

	if (!isRouteExist) {
		throw new AppError(httpStatus.NOT_FOUND, "Bus Route not found");
	}

	if (
		payload.arrivalMinutes > isRouteExist.estimatedMinutes ||
		payload.departureMinutes > isRouteExist.estimatedMinutes
	) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Arrival time (${payload.arrivalMinutes} min) and Departure time (${payload.departureMinutes} min) must be within the route's estimated time (${isRouteExist.estimatedMinutes} min).`,
		);
	}

	const currentMaxStop = await prisma.routeStop.findFirst({
		where: { routeId: payload.routeId },
		orderBy: { stopOrder: "desc" },
	});

	if (
		currentMaxStop &&
		currentMaxStop.arrivalMinutes === isRouteExist.estimatedMinutes
	) {
		if (payload.stopOrder > currentMaxStop.stopOrder) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				`The route has already reached its final destination stop at ${isRouteExist.estimatedMinutes} mins. You cannot add another stop after it.`,
			);
		}
	}

	if (!currentMaxStop || payload.stopOrder > currentMaxStop.stopOrder) {
		if (payload.arrivalMinutes !== isRouteExist.estimatedMinutes) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				`Since this is the final stop (Order: ${payload.stopOrder}), its arrival time must be exactly equal to the route's estimated time (${isRouteExist.estimatedMinutes} min).`,
			);
		}
	}

	const prevStop = (await prisma.routeStop.findFirst({
		where: {
			routeId: payload.routeId,
			stopOrder: payload.stopOrder - 1,
		},
	})) as { departureMinutes: number } | null;

	const nextStop = (await prisma.routeStop.findFirst({
		where: {
			routeId: payload.routeId,
			stopOrder: payload.stopOrder,
		},
	})) as { arrivalMinutes: number } | null;

	if (prevStop) {
		if (payload.arrivalMinutes < prevStop.departureMinutes) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				`Arrival time (${payload.arrivalMinutes} min) must be after previous stop's departure time (${prevStop.departureMinutes} min).`,
			);
		}
	}

	if (nextStop) {
		if (payload.departureMinutes >= nextStop.arrivalMinutes) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				`Departure time (${payload.departureMinutes} min) must be before next stop's arrival time (${nextStop.arrivalMinutes} min).`,
			);
		}
	}

	return await prisma.$transaction(async (prisma) => {
		await prisma.routeStop.updateMany({
			where: {
				routeId: payload.routeId,
				stopOrder: {
					gte: payload.stopOrder,
				},
			},
			data: {
				stopOrder: {
					increment: 1,
				},
				updatedAt: new Date(),
			},
		});

		const routeStop = await prisma.routeStop.create({
			data: {
				stopName: payload.stopName,
				routeId: payload.routeId,
				stopOrder: payload.stopOrder,
				arrivalMinutes: payload.arrivalMinutes,
				departureMinutes: payload.departureMinutes,
			},
		});

		return routeStop;
	});
};

const addManyRouteStop = async (
	payload: AddManyRouteStopPayload,
	user: RequestUser,
) => {
	const isUserExist = await prisma.user.findUnique({
		where: { id: user.id },
	});

	if (!isUserExist) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	const isRouteExist = await prisma.route.findUnique({
		where: { id: payload[0].routeId },
	});

	if (!isRouteExist) {
		throw new AppError(httpStatus.NOT_FOUND, "Bus Route not found");
	}

	const routeStop = await prisma.routeStop.createMany({
		data: payload.map((stop: AddRouteStopPayload) => ({
			stopName: stop.stopName,
			routeId: stop.routeId,
			stopOrder: stop.stopOrder,
			arrivalMinutes: stop.arrivalMinutes,
			departureMinutes: stop.departureMinutes,
		})),
	});

	return routeStop;
};

const getStopsByRoute = async (routeId: string) => {
	const isRouteExist = await prisma.route.findUnique({
		where: { id: routeId },
	});

	if (!isRouteExist) {
		throw new AppError(httpStatus.NOT_FOUND, "Route not found");
	}

	const routeStops = await prisma.routeStop.findMany({
		where: {
			routeId: routeId,
			isDeleted: false,
		},
		orderBy: { stopOrder: "asc" },
	});

	return routeStops;
};

const getAllStops = async (query: IRouteStopQuery) => {
	const limit = query.limit ? Number(query.limit) : 5;
	const page = query.page ? Number(query.page) : 1;
	const skip = (page - 1) * limit;
	const sortBy = query.sortBy ? query.sortBy : "stopOrder";
	const sortOrder = query.sortOrder ? query.sortOrder : "asc";

	const andConditions: RouteStopWhereInput[] = [];

	if (query.routeId) {
		andConditions.push({ routeId: query.routeId });
	}

	if (query.isDeleted !== undefined) {
		andConditions.push({ isDeleted: query.isDeleted });
	} else {
		andConditions.push({ isDeleted: false });
	}

	const routeStops = await prisma.routeStop.findMany({
		where: {
			AND: andConditions,
		},
		take: limit,
		skip: skip,
		orderBy: {
			[sortBy]: sortOrder,
		},
		include: {
			route: true,
		},
	});

	const totalCount = await prisma.routeStop.count({
		where: {
			AND: andConditions,
		},
	});

	return {
		data: routeStops,
		meta: {
			limit,
			page,
			total: totalCount,
			totalPages: Math.ceil(totalCount / limit),
		},
	};
};

const getStopById = async (stopId: string) => {
	const routeStop = await prisma.routeStop.findUnique({
		where: { id: stopId },
		include: {
			route: true,
		},
	});

	if (!routeStop) {
		throw new AppError(httpStatus.NOT_FOUND, "Route stop not found");
	}

	return routeStop;
};

const updateRouteStop = async (
	payload: UpdateRouteStopPayload,
	stopId: string,
	user: RequestUser,
) => {
	const isUserExist = await prisma.user.findUnique({
		where: { id: user.id },
	});

	if (!isUserExist) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	const existingStop = await prisma.routeStop.findUnique({
		where: { id: stopId },
	});

	if (!existingStop || existingStop.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "Route stop not found");
	}

	const isRouteExist = (await prisma.route.findUnique({
		where: { id: existingStop.routeId },
		select: { estimatedMinutes: true, trips: true },
	})) as { estimatedMinutes: number; trips: Trip[] } | null;

	if (!isRouteExist) {
		throw new AppError(httpStatus.NOT_FOUND, "Bus Route not found");
	}

	if (isRouteExist && isRouteExist?.trips.length > 0) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Cannot update route stop for a route that has trips associated with it.",
		);
	}

	const newStopOrder = payload.stopOrder ?? existingStop.stopOrder;
	const newArrival = payload.arrivalMinutes ?? existingStop.arrivalMinutes;
	const newDeparture =
		payload.departureMinutes ?? existingStop.departureMinutes;

	if (newArrival === null || newDeparture === null) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Arrival time and departure time are required for a route stop",
		);
	}

	if (
		newArrival > isRouteExist.estimatedMinutes ||
		newDeparture > isRouteExist.estimatedMinutes
	) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Arrival time (${newArrival} min) and Departure time (${newDeparture} min) must be within the route's estimated time (${isRouteExist.estimatedMinutes} min).`,
		);
	}

	const currentMaxStop = await prisma.routeStop.findFirst({
		where: { routeId: existingStop.routeId, isDeleted: false },
		orderBy: { stopOrder: "desc" },
	});

	if (
		currentMaxStop &&
		currentMaxStop.id !== stopId &&
		currentMaxStop.arrivalMinutes === isRouteExist.estimatedMinutes
	) {
		if (newStopOrder > currentMaxStop.stopOrder) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				`The route has already reached its final destination stop at ${isRouteExist.estimatedMinutes} mins. You cannot add another stop after it.`,
			);
		}
	}

	if (
		!currentMaxStop ||
		(currentMaxStop.id === stopId && newStopOrder >= currentMaxStop.stopOrder)
	) {
		if (
			currentMaxStop?.id !== stopId ||
			newStopOrder > existingStop.stopOrder
		) {
			if (newArrival !== isRouteExist.estimatedMinutes) {
				throw new AppError(
					httpStatus.BAD_REQUEST,
					`Since this is the final stop (Order: ${newStopOrder}), its arrival time must be exactly equal to the route's estimated time (${isRouteExist.estimatedMinutes} min).`,
				);
			}
		}
	}

	const prevStop = await prisma.routeStop.findFirst({
		where: {
			routeId: existingStop.routeId,
			stopOrder: newStopOrder - 1,
			isDeleted: false,
		},
	});

	if (prevStop && prevStop.id !== stopId) {
		if (
			prevStop.departureMinutes !== null &&
			newArrival < prevStop.departureMinutes
		) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				`Arrival time (${newArrival} min) must be after previous stop's departure time (${prevStop.departureMinutes} min).`,
			);
		}
	}

	const nextStop = await prisma.routeStop.findFirst({
		where: {
			routeId: existingStop.routeId,
			stopOrder: newStopOrder + 1,
			isDeleted: false,
		},
	});

	if (nextStop && nextStop.id !== stopId) {
		if (
			nextStop.arrivalMinutes !== null &&
			newDeparture >= nextStop.arrivalMinutes
		) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				`Departure time (${newDeparture} min) must be before next stop's arrival time (${nextStop.arrivalMinutes} min).`,
			);
		}
	}

	return await prisma.$transaction(async (tx) => {
		if (newStopOrder !== existingStop.stopOrder) {
			if (newStopOrder < existingStop.stopOrder) {
				await tx.routeStop.updateMany({
					where: {
						routeId: existingStop.routeId,
						stopOrder: {
							gte: newStopOrder,
							lt: existingStop.stopOrder,
						},
						isDeleted: false,
					},
					data: {
						stopOrder: { increment: 1 },
						updatedAt: new Date(),
					},
				});
			} else {
				await tx.routeStop.updateMany({
					where: {
						routeId: existingStop.routeId,
						stopOrder: {
							gt: existingStop.stopOrder,
							lte: newStopOrder,
						},
						isDeleted: false,
					},
					data: {
						stopOrder: { decrement: 1 },
						updatedAt: new Date(),
					},
				});
			}
		}

		const updatedStop = await tx.routeStop.update({
			where: { id: stopId },
			data: {
				stopName: payload.stopName ?? existingStop.stopName,
				stopOrder: newStopOrder,
				arrivalMinutes: newArrival,
				departureMinutes: newDeparture,
				updatedAt: new Date(),
			},
		});

		return updatedStop;
	});
};

const deleteRouteStop = async (stopId: string, user: RequestUser) => {
	const isUserExist = await prisma.user.findUnique({
		where: { id: user.id },
	});

	if (!isUserExist) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	const existingStop = await prisma.routeStop.findUnique({
		where: { id: stopId },
	});

	if (!existingStop || existingStop.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "Route stop not found");
	}

	const stop = await prisma.$transaction(async (tx) => {
		const deleted = await tx.routeStop.update({
			where: { id: stopId },
			data: {
				isDeleted: true,
				deletedAt: new Date(),
				updatedAt: new Date(),
			},
		});

		await tx.routeStop.updateMany({
			where: {
				routeId: existingStop.routeId,
				stopOrder: { gt: existingStop.stopOrder },
				isDeleted: false,
			},
			data: {
				stopOrder: { decrement: 1 },
				updatedAt: new Date(),
			},
		});

		return deleted;
	});

	return stop;
};

const activateRouteStop = async (stopId: string, user: RequestUser) => {
	const isUserExist = await prisma.user.findUnique({
		where: { id: user.id },
	});

	if (!isUserExist) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	const existingStop = await prisma.routeStop.findUnique({
		where: { id: stopId },
	});

	if (!existingStop?.isDeleted) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Route stop not found or already active",
		);
	}

	const stop = await prisma.routeStop.update({
		where: { id: stopId },
		data: {
			isDeleted: false,
			deletedAt: null,
			updatedAt: new Date(),
		},
	});

	return stop;
};

export const RouteStopService = {
	addRouteStop,
	addManyRouteStop,
	getStopsByRoute,
	getAllStops,
	getStopById,
	updateRouteStop,
	deleteRouteStop,
	activateRouteStop,
};
