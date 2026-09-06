import { addMinutes } from "date-fns";
import { prisma } from "../../lib/prisma";
import { RequestUser } from "../../types/types";
import { AppError } from "../../utils/AppError";
import { CreateBookingPayload } from "./booking.validation";
import { IBookingQuery } from "./booking.interface";
import httpStatus from "http-status";
import { generateBookingNumber } from "../../utils/generateBookingNumber";
import { BookingWhereInput } from "../../../generated/prisma/models";
import { TripSeat } from "../../../generated/prisma/client";

const createBooking = async (
	payload: CreateBookingPayload,
	user: RequestUser,
) => {
	const isUserExists = await prisma.user.findFirst({
		where: { id: user.id, status: "ACTIVE" },
	});

	if (!isUserExists) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	const { fromStopId, passengers, toStopId, tripId, tripSeatIds } = payload;

	const trip = await prisma.trip.findUnique({
		where: { id: tripId },
		include: { tripSeats: true },
	});

	if (!trip) {
		throw new AppError(httpStatus.NOT_FOUND, "Trip not found");
	}

	// Check if all selected seats belong to the trip

	const invalidSeat = tripSeatIds.some(
		(tripSeatId) =>
			!trip.tripSeats.some((seat: TripSeat) => seat.id === tripSeatId),
	);

	if (invalidSeat) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Some selected seats do not belong to this trip",
		);
	}

	if (trip.status !== "SCHEDULED") {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Trip is not available for booking",
		);
	}
	const [fromStop, toStop] = await Promise.all([
		prisma.routeStop.findFirst({
			where: { id: fromStopId, routeId: trip.routeId },
		}),
		prisma.routeStop.findFirst({
			where: { id: toStopId, routeId: trip.routeId },
		}),
	]);

	if (!fromStop) {
		throw new AppError(httpStatus.NOT_FOUND, "From stop not found");
	}

	if (!toStop) {
		throw new AppError(httpStatus.NOT_FOUND, "To stop not found");
	}

	if (fromStop.stopOrder >= toStop.stopOrder) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"From stop must be before to stop",
		);
	}

	const expirationTime = addMinutes(new Date(), 15);

	return await prisma.$transaction(async (tx) => {
		const updatedTripSeats = await tx.tripSeat.updateMany({
			where: {
				id: { in: tripSeatIds },
				tripId,
				status: "AVAILABLE",
				bookingSeat: { is: null },
			},
			data: {
				status: "HELD",
				updatedAt: new Date(),
			},
		});

		if (updatedTripSeats.count !== tripSeatIds.length) {
			throw new AppError(
				httpStatus.CONFLICT,
				"Some selected seats are no longer available. Please try again.",
			);
		}

		const booking = await tx.booking.create({
			data: {
				tripId: tripId,
				userId: user.id,
				fromStopId: fromStopId,
				toStopId: toStopId,
				bookingNumber: generateBookingNumber(),
				totalAmount: Number(trip.fare) * tripSeatIds.length,
				expiresAt: expirationTime,
			},
		});

		await tx.bookingSeat.createMany({
			data: tripSeatIds.map((tripSeatId) => ({
				bookingId: booking.id,
				tripSeatId,
				price: Number(trip.fare),
			})),
		});

		await tx.bookingPassenger.createMany({
			data: passengers.map((p) => ({
				bookingId: booking.id,
				name: p.name,
				email: p.email,
				phone: p.phone,
			})),
		});

		return booking;
	});
};

const getAllBookings = async (query: IBookingQuery) => {
	const limit = query.limit ? Number(query.limit) : 5;
	const page = query.page ? Number(query.page) : 1;
	const skip = (page - 1) * limit;
	const sortBy = query.sortBy ? query.sortBy : "createdAt";
	const sortOrder = query.sortOrder ? query.sortOrder : "desc";

	const andConditions: BookingWhereInput[] = [];

	// searching
	if (query.searchTerm) {
		andConditions.push({
			OR: [
				{
					bookingNumber: {
						contains: query.searchTerm,
						mode: "insensitive",
					},
				},
			],
		});
	}

	// filtering
	if (query.status) {
		andConditions.push({ status: query.status });
	}

	if (query.travelDate) {
		const startOfDay = new Date(query.travelDate);
		startOfDay.setHours(0, 0, 0, 0);

		const endOfDay = new Date(query.travelDate);
		endOfDay.setHours(23, 59, 59, 999);

		andConditions.push({
			trip: {
				travelDate: {
					gte: startOfDay,
					lte: endOfDay,
				},
			},
		});
	}

	const bookings = await prisma.booking.findMany({
		where: { AND: andConditions },
		take: limit,
		skip: skip,
		orderBy: { [sortBy]: sortOrder },
		include: {
			user: {
				select: {
					id: true,
					name: true,
					email: true,
					phone: true,
				},
			},
			trip: {
				include: {
					bus: {
						select: {
							name: true,
							registrationNo: true,
							operator: { select: { companyName: true } },
						},
					},
					route: { select: { source: true, destination: true } },
				},
			},
			fromStop: { select: { stopName: true } },
			toStop: { select: { stopName: true } },
			passengers: true,
			seats: {
				include: {
					tripSeat: {
						include: {
							seat: { select: { seatNumber: true } },
						},
					},
				},
			},
			payment: true,
			ticket: true,
		},
	});

	const totalBookingCount = await prisma.booking.count({
		where: { AND: andConditions },
	});

	return {
		data: bookings,
		meta: {
			limit,
			page,
			total: totalBookingCount,
			totalPages: Math.ceil(totalBookingCount / limit),
		},
	};
};

const getBookingById = async (bookingId: string, user: RequestUser) => {
	const booking = await prisma.booking.findUnique({
		where: { id: bookingId },
		include: {
			user: {
				select: {
					id: true,
					name: true,
					email: true,
					phone: true,
				},
			},
			trip: {
				include: {
					bus: {
						select: {
							name: true,
							registrationNo: true,
							operator: { select: { companyName: true } },
						},
					},
					route: { select: { source: true, destination: true } },
				},
			},
			fromStop: { select: { stopName: true } },
			toStop: { select: { stopName: true } },
			passengers: true,
			seats: {
				include: {
					tripSeat: {
						include: {
							seat: { select: { seatNumber: true } },
						},
					},
				},
			},
			payment: true,
			ticket: true,
		},
	});

	if (!booking) {
		throw new AppError(httpStatus.NOT_FOUND, "Booking not found");
	}

	// passengers can only view their own bookings, admins/operators can view all
	if (user.role === "PASSENGER" && booking.userId !== user.id) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Forbidden. You don't have permission to access this booking.",
		);
	}

	return booking;
};

const getMyBookings = async (user: RequestUser, query: IBookingQuery) => {
	const limit = query.limit ? Number(query.limit) : 5;
	const page = query.page ? Number(query.page) : 1;
	const skip = (page - 1) * limit;
	const sortBy = query.sortBy ? query.sortBy : "createdAt";
	const sortOrder = query.sortOrder ? query.sortOrder : "desc";

	const andConditions: BookingWhereInput[] = [{ userId: user.id }];

	if (query.status) {
		andConditions.push({ status: query.status });
	}

	const bookings = await prisma.booking.findMany({
		where: { AND: andConditions },
		take: limit,
		skip: skip,
		orderBy: { [sortBy]: sortOrder },
		include: {
			trip: {
				include: {
					bus: {
						select: {
							name: true,
							registrationNo: true,
							operator: { select: { companyName: true } },
						},
					},
					route: { select: { source: true, destination: true } },
				},
			},
			fromStop: { select: { stopName: true } },
			toStop: { select: { stopName: true } },
			passengers: true,
			seats: {
				include: {
					tripSeat: {
						include: {
							seat: { select: { seatNumber: true } },
						},
					},
				},
			},
			payment: true,
			ticket: true,
			_count: { select: { seats: true } },
		},
	});

	const totalBookingCount = await prisma.booking.count({
		where: { AND: andConditions },
	});

	return {
		data: bookings,
		meta: {
			limit,
			page,
			total: totalBookingCount,
			totalPages: Math.ceil(totalBookingCount / limit),
		},
	};
};

export const BookingService = {
	createBooking,
	getAllBookings,
	getBookingById,
	getMyBookings,
};
