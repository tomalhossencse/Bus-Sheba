import { UploadApiResponse } from "cloudinary";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";
import { cloudinary } from "../../lib/cloudinary";
import crypto from "crypto";
import ejs from "ejs";
import bcrypt from "bcryptjs";
import config from "../../config";
import { radisClient } from "../../lib/redis";
import { transporter } from "../../lib/nodemailer";
import path from "path";
import { RequestUser } from "../../types/types";
import {
	TApplyAsOperatorPayload,
	TApproveOperatorPayload,
	TOperatorVerifyPayload,
	TUpdateOperatorPayload,
} from "./operator.validation";
import { is } from "zod/locales";
import { IOperatorQuery } from "./operator.interface";
import { OperatorWhereInput } from "../../../generated/prisma/models";

const applyAsOperator = async (
	payload: TApplyAsOperatorPayload,
	nidDocument: Express.Multer.File | null,
	tradeLicenseDocument: Express.Multer.File | null,
	additionalDocuments: Express.Multer.File[],
) => {
	const isUserExist = await prisma.user.findUnique({
		where: { email: payload.user.email },
	});

	if (isUserExist) {
		throw new AppError(
			httpStatus.CONFLICT,
			"User with this email already exists",
		);
	}

	const nidUploadResult = await new Promise<UploadApiResponse>(
		(resolve, reject) => {
			cloudinary.uploader
				.upload_stream({ resource_type: "auto" }, async (error, result) => {
					if (error) {
						console.error("Error uploading NID document:", error);
						throw new AppError(
							httpStatus.INTERNAL_SERVER_ERROR,
							"Failed to upload NID document",
						);
					}

					if (!result) {
						return reject(
							new AppError(
								httpStatus.INTERNAL_SERVER_ERROR,
								"No result returned from Cloudinary for NID document",
							),
						);
					}

					resolve(result);
				})
				.end(nidDocument?.buffer);
		},
	);

	const tradeLicenseUploadResult = await new Promise<UploadApiResponse>(
		(resolve, reject) => {
			cloudinary.uploader
				.upload_stream({ resource_type: "auto" }, async (error, result) => {
					if (error) {
						console.error("Error uploading trade license document:", error);
						throw new AppError(
							httpStatus.INTERNAL_SERVER_ERROR,
							"Failed to upload trade license document",
						);
					}

					if (!result) {
						return reject(
							new AppError(
								httpStatus.INTERNAL_SERVER_ERROR,
								"No result returned from Cloudinary for trade license document",
							),
						);
					}

					resolve(result);
				})
				.end(tradeLicenseDocument?.buffer);
		},
	);

	const additionalDocumentsUploadResults = await Promise.all(
		additionalDocuments.map(
			(doc) =>
				new Promise<UploadApiResponse>((resolve, reject) => {
					cloudinary.uploader
						.upload_stream({ resource_type: "auto" }, async (error, result) => {
							if (error) {
								console.error("Error uploading additional document:", error);
								throw new AppError(
									httpStatus.INTERNAL_SERVER_ERROR,
									"Failed to upload additional document",
								);
							}

							if (!result) {
								return reject(
									new AppError(
										httpStatus.INTERNAL_SERVER_ERROR,
										"No result returned from Cloudinary for additional document",
									),
								);
							}

							resolve(result);
						})
						.end(doc?.buffer);
				}),
		),
	);

	const hashPassword = await bcrypt.hash(
		payload.user.password,
		Number(config.bcrypt_salt_rounds),
	);

	const operatorApplication = await prisma.user.create({
		data: {
			name: payload.user.name,
			email: payload.user.email,
			password: hashPassword,
			role: "OPERATOR",
			operator: {
				create: {
					...payload.operator,
					name: payload.user.name,
					email: payload.user.email,
					nidDocument: nidUploadResult.secure_url,
					nidPublicId: nidUploadResult.public_id,
					tradeLicenseDocument: tradeLicenseUploadResult.secure_url,
					tradeLicensePublicId: tradeLicenseUploadResult.public_id,
					additionalDocuments: additionalDocumentsUploadResults.map((doc) => ({
						url: doc.secure_url,
						publicId: doc.public_id,
					})),
				},
			},
		},
		omit: {
			password: true,
		},
		include: {
			operator: true,
		},
	});

	const otpKey = `operator-registration-otp:${payload.user.email}`;
	const otpValue = crypto.randomInt(100000, 1000000).toString();
	const expirationSeconds = 60 * 5; // 5 minutes

	await radisClient.set(otpKey, otpValue, {
		expiration: {
			type: "EX",
			value: expirationSeconds,
		},
	});
	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/registration-otp.ejs",
	);

	const templateData = {
		name: payload.user.name,
		otp: otpValue,
		expirationMinutes: expirationSeconds / 60,
	};

	const html = await ejs.renderFile(templatePath, templateData);

	await transporter.sendMail({
		from: config.email_sender,
		to: payload.user.email,
		subject: "Verify Your Account - Bus Sheba System",
		html,
	});

	return operatorApplication;
};

const verifyOperator = async (payload: TOperatorVerifyPayload) => {
	const otp = payload.otp;

	const email = payload.email.trim().toLowerCase();

	const isUserExist = await prisma.user.findUnique({
		where: { email, role: "OPERATOR" },
	});

	if (!isUserExist) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"User with this email does not exist",
		);
	}

	if (isUserExist?.emailVerified) {
		throw new AppError(
			httpStatus.CONFLICT,
			"User with this email already exists",
		);
	}

	if (isUserExist?.status === "BLOCKED") {
		throw new AppError(httpStatus.FORBIDDEN, "User is blocked");
	}

	if (isUserExist?.isDeleted || isUserExist?.status === "DELETED") {
		throw new AppError(httpStatus.NOT_FOUND, "User is deleted");
	}

	if (isUserExist?.emailVerified) {
		throw new AppError(httpStatus.CONFLICT, "Your email already verified");
	}

	const otpKey = `operator-registration-otp:${email}`;

	const redisOtp = await radisClient.get(otpKey);

	if (!redisOtp) {
		throw new AppError(httpStatus.BAD_REQUEST, "Invalid OTP");
	}

	if (redisOtp !== otp) {
		throw new AppError(httpStatus.BAD_REQUEST, "OTP does not match");
	}

	await radisClient.del(otpKey);

	const verifiedUser = await prisma.user.update({
		where: { email: isUserExist.email },
		data: {
			emailVerified: true,
		},
		omit: { password: true },
		include: { operator: true },
	});

	return verifiedUser;
};

const approveOperator = async (
	payload: TApproveOperatorPayload,
	reviewer: RequestUser,
) => {
	const { operatorId, verificationStatus, rejectReason } = payload;

	const existingOperator = await prisma.operator.findUnique({
		where: {
			id: operatorId,
		},
		include: {
			user: {
				omit: { password: true },
			},
		},
	});

	if (!existingOperator) {
		throw new AppError(httpStatus.NOT_FOUND, "Operator Application Not Found");
	}

	if (existingOperator.isDeleted) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Operator application has been Deleted",
		);
	}

	if (!existingOperator.user.emailVerified) {
		throw new AppError(httpStatus.BAD_REQUEST, "Operator is not Verified yet");
	}

	if (existingOperator.verificationStatus !== "PENDING") {
		throw new AppError(
			httpStatus.CONFLICT,
			`Operator application is already been ${existingOperator.verificationStatus.toLowerCase()}`,
		);
	}

	if (verificationStatus === "REJECTED" && !rejectReason) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Reject reason is required when rejecting an operator application",
		);
	}

	const updatedOperator = await prisma.operator.update({
		where: {
			id: operatorId,
		},
		data: {
			reviewedById: reviewer.id,
			verificationStatus,
			rejectionReason: verificationStatus === "REJECTED" ? rejectReason : null,
			reviewedAt: new Date(),
		},
		include: {
			user: {
				omit: { password: true },
			},
		},
	});

	const isApproved = verificationStatus === "APPROVED";

	const templatePath = path.join(
		process.cwd(),
		`src/app/templates/${isApproved ? "operator-application-approved.ejs" : "operator-application-reject.ejs"}`,
	);

	const templateData = {
		name: updatedOperator.name,
		email: updatedOperator.email,
		reason: updatedOperator.rejectionReason,
	};

	const html = await ejs.renderFile(templatePath, templateData);

	await transporter.sendMail({
		from: config.email_sender,
		to: updatedOperator.email,
		subject: isApproved
			? "Operator Verification Approved - Bus Sheba System"
			: "Operator Verification Rejected - Bus Sheba System",
		html,
	});

	return updatedOperator;
};

const updateOperator = async (
	payload: TUpdateOperatorPayload,
	user: RequestUser,
) => {
	const isUserExist = await prisma.user.findUnique({
		where: { email: user.email, role: "OPERATOR" },
		include: {
			operator: true,
		},
	});

	if (!isUserExist) {
		throw new AppError(
			httpStatus.CONFLICT,
			"User with this email is not an operator",
		);
	}

	if (isUserExist.isDeleted || isUserExist.status === "DELETED") {
		throw new AppError(httpStatus.NOT_FOUND, "User is deleted");
	}

	if (isUserExist.status === "BLOCKED") {
		throw new AppError(httpStatus.FORBIDDEN, "User is blocked");
	}

	if (isUserExist.operator?.verificationStatus !== "APPROVED") {
		throw new AppError(httpStatus.FORBIDDEN, "Operator is not approved");
	}

	const updatedOperator = await prisma.operator.update({
		where: { userId: isUserExist.id },
		data: {
			contactPerson: payload.contactPerson,
			address: payload.address,
		},
	});

	return updatedOperator;
};

const getAllOperators = async (query: IOperatorQuery) => {
	const limit = query.limit ? Number(query.limit) : 5;
	const page = query.page ? Number(query.page) : 1;
	const skip = (page - 1) * limit;
	const sortBy = query.sortBy ? query.sortBy : "createdAt";
	const sortOrder = query.sortOrder ? query.sortOrder : "desc";

	const andConditions: OperatorWhereInput[] = [{ isDeleted: false }];

	// searching
	if (query.searchTerm) {
		andConditions.push({
			// searching
			OR: [
				{
					name: {
						contains: query.searchTerm,
						mode: "insensitive",
					},
				},
				{
					email: {
						contains: query.searchTerm,
						mode: "insensitive",
					},
				},
				{
					companyName: {
						contains: query.searchTerm,
						mode: "insensitive",
					},
				},
			],
		});
	}

	// filtering
	if (query.verificationStatus) {
		andConditions.push({
			verificationStatus: query.verificationStatus,
		});
	}

	const operators = await prisma.operator.findMany({
		where: {
			AND: andConditions,
		},
		// pagination
		take: limit,
		skip: skip,
		//sorting
		orderBy: {
			[sortBy]: sortOrder,
		},

		include: {
			user: {
				omit: {
					password: true,
				},
			},
		},
	});

	const totalOperatorCount = await prisma.operator.count({
		where: {
			AND: andConditions,
		},
	});

	return {
		data: operators,
		meta: {
			limit,
			page,
			total: totalOperatorCount,
			totalPages: Math.ceil(totalOperatorCount / limit),
		},
	};
};

export const OperatorService = {
	applyAsOperator,
	verifyOperator,
	approveOperator,
	updateOperator,
	getAllOperators,
};
