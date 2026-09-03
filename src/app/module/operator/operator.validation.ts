import { z } from "zod";
import { OperatorVerificationStatus } from "../../../generated/prisma/enums";

export const applyAsOperatorSchema = z.object({
	user: z.object({
		name: z
			.string({ message: "Name is required" })
			.min(3, { message: "Name must be at least 3 characters long" }),

		email: z.email({ message: "Invalid email address" }),

		password: z
			.string("Password must be a string")
			.min(8, { message: "Password must be at least 8 characters long" })
			.regex(/[A-Z]/, { message: "Contain at least one uppercase letter" })
			.regex(/[a-z]/, { message: "Contain at least one lowercase letter" })
			.regex(/[0-9]/, { message: "Contain at least one number" })
			.regex(/[^A-Za-z0-9]/, {
				message: "Contain at least one special character",
			}),
	}),

	operator: z.object({
		companyName: z.string().min(1, { message: "Company name is required" }),

		phone: z.string().regex(/^(?:\+88|88)?(01[3-9]\d{8})$/, {
			message: "Invalid BD phone number. Must be a valid 11-digit number.",
		}),

		nidNumber: z.string().regex(/^(?:\d{10}|\d{13}|\d{17})$/, {
			message: "Invalid NID number. Must be 10, 13, or 17 digits.",
		}),

		tradeLicenseNo: z.string().regex(/^\d{5,15}$/, {
			message: "Invalid Trade License. Must contain 5 to 15 digits.",
		}),

		businessRegistrationNo: z
			.string({ message: "Business Registration Number is required" })
			.min(5, {
				message:
					"Business Registration Number must be at least 5 characters long",
			})
			.max(20, {
				message:
					"Business Registration Number must be at most 20 characters long",
			})
			.regex(/^[A-Za-z0-9\s-]{5,20}$/, {
				message:
					"Invalid Business Registration number. Length should be 5-20 characters.",
			}),

		taxIdentificationNo: z
			.string({ message: "Tax Identification Number is required" })
			.regex(/^\d{12}$/, {
				message: "Invalid TIN. Must be a valid 12-digit number.",
			}),
	}),
});

export const operatorVerifyZodSchema = z.object({
	email: z.email({ message: "Invalid email address" }),
	otp: z.string().length(6, { message: "OTP must be exactly 6 characters" }),
});

export const approveOperatorValidationSchema = z.object({
	operatorId: z
		.string({
			error: "Operator ID is required",
		})
		.min(1, "Operator ID is required"),

	verificationStatus: z.enum(OperatorVerificationStatus, {
		error: "Verification status is required",
	}),

	rejectReason: z.string().optional(),
});

export type TApplyAsOperatorPayload = z.infer<typeof applyAsOperatorSchema>;

export type TOperatorVerifyPayload = z.infer<typeof operatorVerifyZodSchema>;

export type TApproveOperatorPayload = z.infer<
	typeof approveOperatorValidationSchema
>;
