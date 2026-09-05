import { BookingStatus, Role } from "../../generated/prisma/enums";

export interface JwtPayload {
	id: string;
	name: string;
	email: string;
	role: Role;
}

export interface RequestUser extends JwtPayload {}

export type TicketBooking = {
	id: string;
	bookingNumber: string;
	totalAmount: string | number;
	status: BookingStatus;

	fromStop: {
		stopName: string;
	};

	toStop: {
		stopName: string;
	};

	passengers: {
		id: string;
		name: string;
		phone: string;
		email: string | null;
	}[];

	seats: {
		id: string;
		price: string | number;
		tripSeat: {
			seat: {
				seatNumber: string;
			};
		};
	}[];

	trip: {
		travelDate: Date;
		departureTime: Date;
		arrivalTime: Date;

		bus: {
			name: string;
			registrationNo: string;
			operator: {
				companyName: string;
			};
		};

		route: {
			source: string;
			destination: string;
		};
	};

	payment: {
		provider: string;
		trxID: string | null;
		status: string;
		paidAt: Date | null;
	} | null;

	ticket: {
		ticketNumber: string;
		qrCode: string | null;
		issuedAt: Date;
	};
};
