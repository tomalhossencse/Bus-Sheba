export interface IVerifyOperatorPayload {
	email: string;
	otp: string;
}

export interface IApproveOperatorPayload {
	operatorId: string;
	verificationStatus: "APPROVED" | "REJECTED";
	rejectReason?: string;
}
