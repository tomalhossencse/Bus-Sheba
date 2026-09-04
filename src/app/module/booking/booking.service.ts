import { addMinutes } from "date-fns";
import { prisma } from "../../lib/prisma";
import { RequestUser } from "../../types/types";
import { AppError } from "../../utils/AppError";
import { CreateBookingPayload } from "./booking.validation";
import httpStatus from "http-status";
import { generateBookingNumber } from "../../utils/generateBookingNumber";

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
			throw new AppError(httpStatus.CONFLICT, "Some seats were just taken");
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

export const BookingService = {
	createBooking,
};
