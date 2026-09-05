import { RouteStopWhereInput } from "../../../generated/prisma/models";

export interface IRouteStopQuery extends RouteStopWhereInput {
	page?: string;
	limit?: string;
	sortBy?: string;
	sortOrder?: string;
	routeId?: string;
	isDeleted?: boolean;
}
