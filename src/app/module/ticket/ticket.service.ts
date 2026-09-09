import { prisma } from "../../lib/prisma";
import { RequestUser } from "../../types/types";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";

const checkTicketCallback = async (ticketNumber: string) => {
	const bookingId = ticketNumber.slice(10);
	const booking = await prisma.booking.findUnique({
		where: { id: bookingId },
		include: { ticket: true },
	});

	if (!booking) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"No booking found with this ticket",
		);
	}
	return booking;
};

const verifyTicket = async (ticketNumber: string, user: RequestUser) => {
	const operator = await prisma.operator.findUnique({
		where: {
			userId: user.id,
			user: {
				role: "OPERATOR",
			},
		},
	});

	if (!operator) {
		throw new AppError(httpStatus.NOT_FOUND, "Operator not found");
	}

	const bookingId = ticketNumber.slice(10);

	const booking = await prisma.booking.findUnique({
		where: { id: bookingId },
		include: {
			ticket: true,
			trip: { include: { bus: true } },
		},
	});

	if (!booking) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"No booking found with this ticket",
		);
	}

	if (booking.trip.bus.operatorId !== operator.id) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Forbidden. You don't have permission to access this resource.",
		);
	}

	if (booking.trip.status === "CANCELLED") {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Cannot verify ticket for a cancelled trip",
		);
	}

	// const now = new Date()

	// if(booking.trip.departureTime < now){
	// 	throw new AppError(httpStatus.BAD_REQUEST , "You don't have permission")
	// }

	const updateTicket = await prisma.ticket.update({
		where: { bookingId },
		data: {
			status: "USED",
			usedAt: new Date(),
		},
		include: { booking: true },
	});

	return updateTicket;
};

export const TicketService = {
	checkTicketCallback,
	verifyTicket,
};
