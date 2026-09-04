import { prisma } from "../../lib/prisma";
import { RequestUser } from "../../types/types";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";
import {
	AddManyRouteStopPayload,
	AddRouteStopPayload,
} from "./routeStop.validation";

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

export const RouteStopService = {
	addRouteStop,
	addManyRouteStop,
};
