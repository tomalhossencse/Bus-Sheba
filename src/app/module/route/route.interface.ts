import { RouteWhereInput } from "../../../generated/prisma/models";

export interface IRouteQuery extends RouteWhereInput {
	searchTerm?: string;
	page?: string;
	limit?: string;
	sortBy?: string;
	sortOrder?: string;
	source?: string;
	destination?: string;
	isActive?: boolean;
	minDistance?: number;
	maxDistance?: number;
}
