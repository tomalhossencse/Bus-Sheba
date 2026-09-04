import { prisma } from "../../lib/prisma";
import { RequestUser } from "../../types/types";
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
		throw new Error("User not found");
	}

	const isRouteExist = await prisma.route.findUnique({
		where: { id: payload.routeId },
	});

	if (!isRouteExist) {
		throw new Error("Bus Route not found");
	}

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
};

const addManyRouteStop = async (
	payload: AddManyRouteStopPayload,
	user: RequestUser,
) => {
	const isUserExist = await prisma.user.findUnique({
		where: { id: user.id },
	});

	if (!isUserExist) {
		throw new Error("User not found");
	}

	const isRouteExist = await prisma.route.findUnique({
		where: { id: payload[0].routeId },
	});

	if (!isRouteExist) {
		throw new Error("Bus Route not found");
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
