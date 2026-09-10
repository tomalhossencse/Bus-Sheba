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
			fromStop: { select: { id: true, stopName: true, stopOrder: true, arrivalMinutes: true, departureMinutes: true } },
			toStop: { select: { id: true, stopName: true, stopOrder: true, arrivalMinutes: true, departureMinutes: true } },
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

	if (booking.trip.status === "DEPARTED" || booking.trip.status === "COMPLETED") {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Boarding verification is closed for this trip",
		);
	}

	if (booking.status !== "CONFIRMED" || booking.ticket?.status !== "ACTIVE") {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Only a confirmed active ticket can be used for boarding",
		);
	}

	if (booking.ticket?.status === "USED") {
		throw new AppError(
			httpStatus.CONFLICT,
			`Ticket has already been used${booking.ticket.usedAt ? ` at ${booking.ticket.usedAt.toISOString()}` : ""}`,
		);
	}

	const updatedTicket = await prisma.ticket.updateMany({
		where: { bookingId, status: "ACTIVE" },
		data: {
			status: "USED",
			usedAt: new Date(),
		},
	});

	if (updatedTicket.count !== 1) {
		throw new AppError(
			httpStatus.CONFLICT,
			"Ticket was already used by another scan",
		);
	}

	return previewOperatorTicket(ticketNumber, user);
};

const previewOperatorTicket = async (
	ticketNumber: string,
	user: RequestUser,
) => {
	const operator = await prisma.operator.findUnique({
		where: {
			userId: user.id,
			user: { role: "OPERATOR" },
		},
	});

	if (!operator) {
		throw new AppError(httpStatus.NOT_FOUND, "Operator not found");
	}

	const ticket = await prisma.ticket.findUnique({
		where: { ticketNumber },
		include: {
			booking: {
				include: {
					user: {
						select: { id: true, name: true, email: true, phone: true },
					},
					trip: {
						include: {
							bus: true,
							route: { select: { source: true, destination: true } },
						},
					},
					fromStop: {
						select: {
							id: true,
							stopName: true,
							stopOrder: true,
							arrivalMinutes: true,
							departureMinutes: true,
						},
					},
					toStop: {
						select: {
							id: true,
							stopName: true,
							stopOrder: true,
							arrivalMinutes: true,
							departureMinutes: true,
						},
					},
					passengers: true,
					seats: {
						include: {
							tripSeat: {
								include: { seat: { select: { seatNumber: true } } },
							},
						},
					},
					payment: true,
				},
			},
		},
	});

	if (!ticket) {
		throw new AppError(httpStatus.NOT_FOUND, "Ticket not found");
	}

	if (ticket.booking.trip.bus.operatorId !== operator.id) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"This ticket belongs to another operator",
		);
	}

	return ticket;
};

export const TicketService = {
	checkTicketCallback,
	verifyTicket,
	previewOperatorTicket,
};
