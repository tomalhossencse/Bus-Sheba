import { prisma } from "../../lib/prisma";
import { RequestUser } from "../../types/types";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";

const checkTicketCallback = async (ticketNumber: string) => {
	const ticket = await prisma.ticket.findUnique({
		where: { ticketNumber },
		select: { bookingId: true },
	});

	if (!ticket) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"No booking found with this ticket",
		);
	}

	const booking = await prisma.booking.findUnique({
		where: { id: ticket.bookingId },
		include: {
			ticket: true,
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
					route: {
						select: {
							source: true,
							destination: true,
						},
					},
				},
			},
			passengers: true,
			payment: true,
			fromStop: { select: { stopName: true } },
			toStop: { select: { stopName: true } },
		},
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

	const ticketRecord = await prisma.ticket.findUnique({
		where: { ticketNumber },
		select: { bookingId: true },
	});

	if (!ticketRecord) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"No booking found with this ticket",
		);
	}

	const bookingId = ticketRecord.bookingId;

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
		include: {
			booking: {
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
							bus: true,
							route: {
								select: {
									source: true,
									destination: true,
								},
							},
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
			},
		},
	});

	return updateTicket;
};

export const TicketService = {
	checkTicketCallback,
	verifyTicket,
};
