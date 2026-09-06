import { BookingStatus } from "../../../generated/prisma/enums";
import { BookingWhereInput } from "../../../generated/prisma/models";

export interface IBookingQuery extends BookingWhereInput {
	searchTerm?: string;
	page?: string;
	limit?: string;
	sortBy?: string;
	sortOrder?: string;
	travelDate?: string;
	status?: BookingStatus;
}
