import { OperatorWhereInput } from "../../../generated/prisma/models";

export interface IVerifyOperatorPayload {
	email: string;
	otp: string;
}

export interface IApproveOperatorPayload {
	operatorId: string;
	verificationStatus: "APPROVED" | "REJECTED";
	rejectReason?: string;
}

export interface IOperatorQuery extends OperatorWhereInput {
	searchTerm?: string;
	page?: string;
	limit?: string;
	sortBy?: string;
	sortOrder?: string;
}
