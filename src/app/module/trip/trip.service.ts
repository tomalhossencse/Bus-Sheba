import { RequestUser } from "../../types/types";
import { AppError } from "../../utils/AppError";
import { CreateTripPayload } from "./trip.validation";
import { prisma } from "../../lib/prisma";
import httpStatus from "http-status";
const createTrip = async (payload: CreateTripPayload, user: RequestUser) => {
	const isUserExists = await prisma.user.findUnique({
		where: { id: user.id },
		include: { operator: true },
	});

	if (!isUserExists) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	const operator = await prisma.operator.findUnique({
		where: { userId: user.id },
	});

	if (!operator) {
		throw new AppError(httpStatus.NOT_FOUND, "Operator not found");
	}

	const bus = await prisma.bus.findFirst({
		where: { id: payload.busId },
	});

	if (!bus) {
		throw new AppError(httpStatus.NOT_FOUND, "Bus not found");
	}

	if (bus.operatorId !== operator.id) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You are not authorized to create a trip for this bus",
		);
	}

	const route = await prisma.route.findUnique({
		where: { id: payload.routeId },
	});

	if (!route) {
		throw new AppError(httpStatus.NOT_FOUND, "Route not found");
	}

	const existingTrip = await prisma.trip.findFirst({
		where: {
			routeId: payload.routeId,
			busId: payload.busId,
			travelDate: payload.travelDate,
		},
	});

	if (existingTrip) {
		throw new AppError(httpStatus.CONFLICT, "Trip already exists");
	}

	const trip = await prisma.trip.create({
		data: {
			routeId: payload.routeId,
			busId: payload.busId,
			travelDate: payload.travelDate,
			arrivalTime: payload.arrivalTime,
			departureTime: payload.departureTime,
			fare: payload.fare,
		},
	});

	return trip;
};

export const TripService = {
	createTrip,
};
