import { BusStatus, BusType, SeatLayout } from "../../../generated/prisma/enums";
import { BusWhereInput } from "../../../generated/prisma/models";

export interface addBusPayload {
	name: string;
	registrationNo: string;
	busType: BusType;
	seatLayout?: SeatLayout;
	totalSeats: number;
}

export interface IBusQuery extends BusWhereInput {
	searchTerm?: string;
	page?: string;
	limit?: string;
	sortBy?: string;
	sortOrder?: string;
	totalSeats?: number;
	companyName?: string;
	operatorEmail?: string;
	maxSeats?: number;
	minSeats?: number;
	status?: BusStatus;
}
