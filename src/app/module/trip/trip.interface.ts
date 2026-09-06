import { TripStatus } from "../../../generated/prisma/enums";
import { TripWhereInput } from "../../../generated/prisma/models";

export interface ITripQuery extends TripWhereInput {
	searchTerm?: string;
	page?: string;
	limit?: string;
	sortBy?: string;
	sortOrder?: string;
	source?: string;
	destination?: string;
	travelDate?: string;
	busType?: string;
	status?: TripStatus;
	minFare?: number;
	maxFare?: number;
}
