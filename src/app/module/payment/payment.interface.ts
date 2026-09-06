import { PaymentWhereInput } from "../../../generated/prisma/models";

export interface IGetPaymentsQuery extends PaymentWhereInput {
	searchTerm?: string;
	page?: string;
	limit?: string;
	sortBy?: string;
	sortOrder?: string;
	maxAmount?: number;
	minAmount?: number;
}
