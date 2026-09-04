import { prisma } from "../../lib/prisma";
import { RequestUser } from "../../types/types";
import { AddRoutePayload } from "./route.validation";

const addRoute = async (payload: AddRoutePayload, user: RequestUser) => {
	const isUserExist = await prisma.user.findUnique({
		where: { id: user.id },
	});

	if (!isUserExist) {
		throw new Error("User not found");
	}
	const route = await prisma.route.create({
		data: {
			name: payload.name,
			source: payload.source,
			destination: payload.destination,
			distanceKm: payload.distanceKm,
			estimatedMinutes: payload.estimatedMinutes,
		},
	});

	return route;
};

export const RouteService = {
	addRoute,
};
