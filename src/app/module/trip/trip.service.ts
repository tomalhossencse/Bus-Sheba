import httpStatus from "http-status";
import {
	BusType,
	TripSeatStatus,
	TripStatus,
} from "../../../generated/prisma/enums";
import { TripWhereInput } from "../../../generated/prisma/models";
import { refundBkashPayment } from "../../lib/bkash";
import { prisma } from "../../lib/prisma";
import { RequestUser } from "../../types/types";
import { AppError } from "../../utils/AppError";
import { ITripQuery } from "./trip.interface";
import { CreateTripPayload, UpdateTripPayload } from "./trip.validation";
import { addDays, differenceInMinutes, getDate, getDay } from "date-fns";

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
		include: { seats: true },
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

	if (bus.status !== "ACTIVE") {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Bus is not active. Cannot create a trip for an inactive bus",
		);
	}

	const route = await prisma.route.findUnique({
		where: { id: payload.routeId },
	});

	if (!route) {
		throw new AppError(httpStatus.NOT_FOUND, "Route not found");
	}

	if (!route.isActive) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Route is deactivated. Cannot create a trip on a deactivated route",
		);
	}

	const existingTrip = await prisma.trip.findFirst({
		where: {
			OR: [
				{
					routeId: payload.routeId,
					travelDate: payload.travelDate,
					departureTime: payload.departureTime,
				},
				{
					busId: payload.busId,
					travelDate: payload.travelDate,
					departureTime: payload.departureTime,
				},
			],
		},
	});

	if (existingTrip) {
		throw new AppError(
			httpStatus.CONFLICT,
			"Trip already exists for this bus or route on this date",
		);
	}

	if (
		getDate(payload.travelDate) !== getDate(payload.departureTime) ||
		getDay(payload.travelDate) !== getDay(payload.departureTime)
	) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Travel date and departure date must be the same",
		);
	}

	if (addDays(payload.departureTime, 1) < new Date()) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Departure time minimum should be 1 day after the current date and time",
		);
	}

	if (
		route.estimatedMinutes !==
		differenceInMinutes(payload.arrivalTime, payload.departureTime)
	) {
		throw new Error(
			"Arrival time does not match the estimated travel time for this route",
		);
	}

	const trip = await prisma.trip.create({
		data: {
			routeId: payload.routeId,
			busId: payload.busId,
			travelDate: payload.travelDate,
			arrivalTime: payload.arrivalTime,
			departureTime: payload.departureTime,
			fare: payload.fare,
			tripSeats: {
				createMany: {
					data: bus.seats
						.filter((seat) => !seat.isDeleted)
						.map((seat) => ({
							seatId: seat.id,
						})),
				},
			},
		},
		include: {
			bus: true,
			route: true,
			tripSeats: true,
		},
	});

	return trip;
};

const updateTrip = async (
	payload: UpdateTripPayload,
	tripId: string,
	user: RequestUser,
) => {
	const isUserExists = await prisma.user.findUnique({
		where: { id: user.id },
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

	const tripExists = await prisma.trip.findUnique({
		where: { id: tripId },
		include: {
			bus: true,
			bookings: {
				where: {
					status: { in: ["PENDING", "CONFIRMED"] },
				},
			},
		},
	});

	if (!tripExists) {
		throw new AppError(httpStatus.NOT_FOUND, "Trip not found");
	}

	if (tripExists.bus.operatorId !== operator.id) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You are not authorized to update this trip",
		);
	}

	if (["DEPARTED", "COMPLETED", "CANCELLED"].includes(tripExists.status)) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Cannot update a trip that is ${tripExists.status.toLowerCase()}`,
		);
	}

	if (tripExists.bookings.length > 0) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Cannot update a trip that already has bookings",
		);
	}

	if (payload.busId && payload.busId !== tripExists.busId) {
		const newBus = await prisma.bus.findFirst({
			where: { id: payload.busId },
			include: { seats: true },
		});

		if (!newBus) {
			throw new AppError(httpStatus.NOT_FOUND, "New bus not found");
		}

		if (newBus.operatorId !== operator.id) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"You are not authorized to create a trip for this bus",
			);
		}

		if (newBus.status !== "ACTIVE") {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Bus is not active. Cannot create a trip for an inactive bus",
			);
		}

		const conflictBusTrip = await prisma.trip.findFirst({
			where: {
				busId: payload.busId,
				travelDate: payload.travelDate ?? tripExists.travelDate,
				departureTime: payload.departureTime ?? tripExists.departureTime,
			},
		});

		if (conflictBusTrip) {
			throw new AppError(
				httpStatus.CONFLICT,
				"New bus already has a trip on this date and time",
			);
		}

		await prisma.tripSeat.deleteMany({
			where: { tripId },
		});

		await prisma.tripSeat.createMany({
			data: newBus.seats
				.filter((seat) => !seat.isDeleted)
				.map((seat) => ({
					tripId,
					seatId: seat.id,
				})),
		});
	}

	if (payload.routeId && payload.routeId !== tripExists.routeId) {
		const newRoute = await prisma.route.findUnique({
			where: { id: payload.routeId },
		});

		if (!newRoute) {
			throw new AppError(httpStatus.NOT_FOUND, "New route not found");
		}

		if (!newRoute.isActive) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Route is deactivated. Cannot create a trip on a deactivated route",
			);
		}

		const conflictRouteTrip = await prisma.trip.findFirst({
			where: {
				routeId: payload.routeId,
				travelDate: payload.travelDate ?? tripExists.travelDate,
				departureTime: payload.departureTime ?? tripExists.departureTime,
			},
		});

		if (conflictRouteTrip) {
			throw new AppError(
				httpStatus.CONFLICT,
				"New route already has a trip on this date and time",
			);
		}
	}

	const trip = await prisma.trip.update({
		where: { id: tripId },
		data: {
			busId: payload.busId ?? tripExists.busId,
			routeId: payload.routeId ?? tripExists.routeId,
			travelDate: payload.travelDate ?? tripExists.travelDate,
			departureTime: payload.departureTime ?? tripExists.departureTime,
			arrivalTime: payload.arrivalTime ?? tripExists.arrivalTime,
			fare: payload.fare ?? tripExists.fare,
			updatedAt: new Date(),
		},
		include: {
			bus: true,
			route: true,
			tripSeats: true,
		},
	});

	return trip;
};

const cancelTrip = async (tripId: string, user: RequestUser) => {
	const isUserExists = await prisma.user.findUnique({
		where: { id: user.id },
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

	const tripExists = await prisma.trip.findUnique({
		where: { id: tripId },
		include: {
			bus: true,
			bookings: {
				where: {
					status: { in: ["PENDING", "CONFIRMED"] },
				},
				include: { payment: true },
			},
		},
	});

	if (!tripExists) {
		throw new AppError(httpStatus.NOT_FOUND, "Trip not found");
	}

	if (tripExists.bus.operatorId !== operator.id) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You are not authorized to cancel this trip",
		);
	}

	if (tripExists.status === "CANCELLED") {
		throw new AppError(httpStatus.BAD_REQUEST, "Trip is already cancelled");
	}

	if (["DEPARTED", "COMPLETED"].includes(tripExists.status)) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Cannot cancel a trip that has already ${tripExists.status.toLowerCase()}`,
		);
	}
	const confirmedPayments = tripExists.bookings.filter(
		(booking) =>
			booking.status === "CONFIRMED" &&
			booking.payment &&
			booking.payment.status === "PAID",
	);

	const refundResults: { paymentId: string; refundTrxId: string }[] = [];
	const queuedRefundIds: string[] = [];

	for (const booking of confirmedPayments) {
		const payment = booking.payment;

		if (!payment?.paymentID || !payment?.trxID) {
			queuedRefundIds.push(payment?.id || "");
			continue;
		}

		try {
			const bkashRefundResult = await refundBkashPayment({
				paymentID: payment.paymentID,
				trxID: payment.trxID,
				amount: payment.amount?.toString() || "0",
			});

			refundResults.push({
				paymentId: payment.id,
				refundTrxId: bkashRefundResult.refundTrxId,
			});
		} catch (error) {
			queuedRefundIds.push(payment.id);
			console.warn(
				`[Trip Cancel] Warn: Refund failed for payment ${payment.id}, queued for cron retry.`,
				error,
			);
		}
	}

	const trip = await prisma.$transaction(async (tx) => {
		const cancelledBookingIds = tripExists.bookings.map(
			(booking) => booking.id,
		);

		if (cancelledBookingIds.length > 0) {
			await tx.booking.updateMany({
				where: {
					id: { in: cancelledBookingIds },
					status: "PENDING",
				},
				data: { status: "EXPIRED", cancelledAt: new Date() },
			});

			const confirmedBookingIds = tripExists.bookings
				.filter((booking) => booking.status === "CONFIRMED")
				.map((booking) => booking.id);

			if (confirmedBookingIds.length > 0) {
				await tx.booking.updateMany({
					where: { id: { in: confirmedBookingIds } },
					data: { status: "CANCELLED", cancelledAt: new Date() },
				});

				for (const { paymentId, refundTrxId } of refundResults) {
					await tx.payment.update({
						where: { id: paymentId },
						data: {
							status: "REFUNDED",
							refundTrxId,
							refundAmount: tripExists.bookings.find(
								(booking) => booking.payment?.id === paymentId,
							)?.payment?.amount,
							refundReason: "Trip cancelled by operator",
							refundedAt: new Date().toISOString(),
						},
					});
				}

				for (const paymentId of queuedRefundIds) {
					await tx.payment.update({
						where: { id: paymentId },
						data: {
							status: "REFUND_PENDING",
							refundReason: "Trip cancelled by operator",
						},
					});
				}

				const pendingPayments = tripExists.bookings.filter(
					(booking) =>
						booking.status === "CONFIRMED" &&
						booking.payment &&
						booking.payment.status === "PENDING",
				);

				for (const booking of pendingPayments) {
					await tx.payment.update({
						where: { id: booking.payment?.id },
						data: { status: "CANCELLED" },
					});
				}
			}
		}

		const updatedTrip = await tx.trip.update({
			where: { id: tripId },
			data: {
				status: "CANCELLED",
				updatedAt: new Date(),
			},
			include: {
				bus: true,
				route: true,
			},
		});

		return updatedTrip;
	});

	return trip;
};

const changeTripStatus = async (
	status: TripStatus,
	tripId: string,
	user: RequestUser,
) => {
	const isUserExists = await prisma.user.findUnique({
		where: { id: user.id },
	});

	if (!isUserExists) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	const tripExists = await prisma.trip.findUnique({
		where: { id: tripId },
		include: { bus: true },
	});

	if (!tripExists) {
		throw new AppError(httpStatus.NOT_FOUND, "Trip not found");
	}

	if (user.role === "OPERATOR") {
		const operator = await prisma.operator.findUnique({
			where: { userId: user.id },
		});

		if (!operator) {
			throw new AppError(httpStatus.NOT_FOUND, "Operator not found");
		}

		if (tripExists.bus.operatorId !== operator.id) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"You are not authorized to manage this trip",
			);
		}
	}

	if (tripExists.status === "CANCELLED") {
		throw new AppError(httpStatus.BAD_REQUEST, "Trip is already cancelled");
	}

	const trip = await prisma.trip.update({
		where: { id: tripId },
		data: {
			status,
			updatedAt: new Date(),
		},
		include: {
			bus: true,
			route: true,
		},
	});

	return trip;
};

const getTripById = async (tripId: string) => {
	const trip = await prisma.trip.findUnique({
		where: { id: tripId },
		include: {
			bus: {
				include: {
					operator: true,
					seats: {
						where: { isDeleted: false },
						orderBy: [{ rowNumber: "asc" }, { columnNumber: "asc" }],
					},
				},
			},
			route: {
				include: {
					stops: {
						where: { isDeleted: false },
						orderBy: { stopOrder: "asc" },
					},
				},
			},
			tripSeats: {
				orderBy: {
					seat: {
						rowNumber: "asc",
					},
				},
				include: {
					seat: true,
				},
			},
			_count: {
				select: { bookings: true },
			},
		},
	});

	if (!trip) {
		throw new AppError(httpStatus.NOT_FOUND, "Trip not found");
	}

	return trip;
};

const getTripSeats = async (tripId: string, query: { status?: string }) => {
	const trip = await prisma.trip.findUnique({
		where: { id: tripId },
		select: { id: true },
	});

	if (!trip) {
		throw new AppError(httpStatus.NOT_FOUND, "Trip not found");
	}

	const seats = await prisma.tripSeat.findMany({
		where: {
			tripId,
			...(query.status ? { status: query.status as TripSeatStatus } : {}),
		},
		orderBy: {
			seat: {
				rowNumber: "asc",
			},
		},
		include: {
			seat: true,
			bookingSeat: {
				select: {
					bookingId: true,
					price: true,
				},
			},
		},
	});

	return seats;
};

const searchTrips = async (query: ITripQuery) => {
	const { source, destination, travelDate } = query;

	if (!source || !destination) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Source and destination are required",
		);
	}

	const tripWhere: TripWhereInput = {
		status: "SCHEDULED",
		departureTime: {
			gt: new Date(),
		},
		route: {
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
		bus: {
			status: "ACTIVE",
		},
	};

	if (travelDate) {
		const startOfDay = new Date(travelDate);
		startOfDay.setHours(0, 0, 0, 0);

		const endOfDay = new Date(travelDate);
		endOfDay.setHours(23, 59, 59, 999);

		tripWhere.travelDate = {
			gte: startOfDay,
			lte: endOfDay,
		};
	}

	const trips = await prisma.trip.findMany({
		where: tripWhere,
		include: {
			bus: {
				include: {
					operator: true,
				},
			},
			route: {
				include: {
					stops: {
						where: { isDeleted: false },
						orderBy: { stopOrder: "asc" },
					},
				},
			},
			_count: {
				select: {
					bookings: true,
					tripSeats: true,
				},
			},
		},
		orderBy: {
			departureTime: "asc",
		},
	});

	return trips;
};

const getAvailableSeats = async (tripId: string) => {
	const trip = await prisma.trip.findUnique({
		where: { id: tripId },
		include: {
			route: {
				include: { stops: true },
			},
		},
	});

	if (!trip) {
		throw new AppError(httpStatus.NOT_FOUND, "Trip not found");
	}

	if (trip.status !== "SCHEDULED") {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Trip is not available for booking",
		);
	}

	const availableSeats = await prisma.tripSeat.findMany({
		where: {
			tripId,
			status: "AVAILABLE",
		},
		orderBy: {
			seat: {
				rowNumber: "asc",
			},
		},
		include: {
			seat: true,
		},
	});

	return { availableSeats, totalAvailable: availableSeats.length };
};

const getMyTrips = async (user: RequestUser, query: ITripQuery) => {
	const operator = await prisma.operator.findUnique({
		where: { userId: user.id },
	});

	if (!operator) {
		throw new AppError(httpStatus.NOT_FOUND, "Operator not found");
	}

	const limit = query.limit ? Number(query.limit) : 10;
	const page = query.page ? Number(query.page) : 1;
	const skip = (page - 1) * limit;
	const sortBy = query.sortBy ? query.sortBy : "departureTime";
	const sortOrder = query.sortOrder ? query.sortOrder : "asc";

	const andConditions: TripWhereInput[] = [
		{
			bus: {
				operatorId: operator.id,
			},
		},
	];

	if (query.status) {
		andConditions.push({
			status: query.status,
		});
	}

	if (query.travelDate) {
		const startOfDay = new Date(query.travelDate);
		startOfDay.setHours(0, 0, 0, 0);

		const endOfDay = new Date(query.travelDate);
		endOfDay.setHours(23, 59, 59, 999);

		andConditions.push({
			travelDate: {
				gte: startOfDay,
				lte: endOfDay,
			},
		});
	}

	if (query.source) {
		andConditions.push({
			route: {
				source: {
					contains: query.source,
					mode: "insensitive",
				},
			},
		});
	}

	if (query.destination) {
		andConditions.push({
			route: {
				destination: {
					contains: query.destination,
					mode: "insensitive",
				},
			},
		});
	}

	const trips = await prisma.trip.findMany({
		where: {
			AND: andConditions,
		},
		take: limit,
		skip: skip,
		orderBy: {
			[sortBy]: sortOrder,
		} as const,
		include: {
			bus: true,
			route: true,
			_count: {
				select: {
					bookings: true,
					tripSeats: true,
				},
			},
		},
	});

	const totalTripsCount = await prisma.trip.count({
		where: {
			AND: andConditions,
		},
	});

	return {
		data: trips,
		meta: {
			limit,
			page,
			total: totalTripsCount,
			totalPages: Math.ceil(totalTripsCount / limit),
		},
	};
};

const getAllTrips = async (query: ITripQuery) => {
	const limit = query.limit ? Number(query.limit) : 10;
	const page = query.page ? Number(query.page) : 1;
	const skip = (page - 1) * limit;
	const sortBy = query.sortBy ? query.sortBy : "departureTime";
	const sortOrder = query.sortOrder ? query.sortOrder : "asc";

	const andConditions: TripWhereInput[] = [];

	if (query.searchTerm) {
		andConditions.push({
			OR: [
				{
					bus: {
						name: {
							contains: query.searchTerm,
							mode: "insensitive",
						},
					},
				},
				{
					route: {
						source: {
							contains: query.searchTerm,
							mode: "insensitive",
						},
					},
				},
				{
					route: {
						destination: {
							contains: query.searchTerm,
							mode: "insensitive",
						},
					},
				},
			],
		});
	}

	if (query.source) {
		andConditions.push({
			route: {
				source: {
					contains: query.source,
					mode: "insensitive",
				},
			},
		});
	}

	if (query.destination) {
		andConditions.push({
			route: {
				destination: {
					contains: query.destination,
					mode: "insensitive",
				},
			},
		});
	}

	if (query.travelDate) {
		const startOfDay = new Date(query.travelDate);
		startOfDay.setHours(0, 0, 0, 0);

		const endOfDay = new Date(query.travelDate);
		endOfDay.setHours(23, 59, 59, 999);

		andConditions.push({
			travelDate: {
				gte: startOfDay,
				lte: endOfDay,
			},
		});
	}

	if (query.busType) {
		andConditions.push({
			bus: {
				busType: query.busType as BusType,
			},
		});
	}

	if (query.status) {
		andConditions.push({
			status: query.status,
		});
	}

	if (query.minFare) {
		andConditions.push({
			fare: {
				gte: Number(query.minFare),
			},
		});
	}

	if (query.maxFare) {
		andConditions.push({
			fare: {
				lte: Number(query.maxFare),
			},
		});
	}

	const trips = await prisma.trip.findMany({
		where: {
			AND: andConditions,
		},
		take: limit,
		skip: skip,
		orderBy: {
			[sortBy]: sortOrder,
		} as const,
		include: {
			bus: {
				include: {
					operator: true,
				},
			},
			route: true,
			_count: {
				select: {
					bookings: true,
					tripSeats: true,
				},
			},
		},
	});

	const totalTripsCount = await prisma.trip.count({
		where: {
			AND: andConditions,
		},
	});

	return {
		data: trips,
		meta: {
			limit,
			page,
			total: totalTripsCount,
			totalPages: Math.ceil(totalTripsCount / limit),
		},
	};
};

export const TripService = {
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
