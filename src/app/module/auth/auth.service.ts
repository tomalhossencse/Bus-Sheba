import bcrypt from "bcryptjs";
import { JwtPayload } from "jsonwebtoken";
import config from "../../config";
import { prisma } from "../../lib/prisma";
import {
	IChangePasswordPayload,
	IForgetPasswordPayload,
	IGoogleLoginPayload,
	IImageFile,
	ILoginUserPayload,
	IRegisterPassengerPayload,
	IResetPasswordPayload,
	IUpdateProfilePayload,
	IVerifyPassengerPayload,
} from "./auth.validation";
import { Role, UserStatus } from "../../../generated/prisma/enums";
import { signToken, verifyToken } from "../../utils/jwt";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";
import crypto from "crypto";
import { radisClient } from "../../lib/redis";
import path from "path";
import ejs, { name } from "ejs";
import { transporter } from "../../lib/nodemailer";
import { RequestUser } from "../../types/types";
import { TokenPayload } from "google-auth-library";
import { googleClient } from "../../lib/googleAuth";

import { UploadApiResponse } from "cloudinary";
import { cloudinary } from "../../lib/cloudinary";
import { buffer } from "stream/consumers";
const registerPassenger = async (payload: IRegisterPassengerPayload) => {
	const { name, password } = payload;
	const email = payload.email.trim().toLowerCase();

	const isUserExists = await prisma.user.findUnique({
		where: { email },
	});

	if (isUserExists) {
		throw new AppError(
			httpStatus.CONFLICT,
			"User already exists with this email. Please try to login.",
		);
	}

	const hashedPassword = await bcrypt.hash(
		password,
		Number(config.bcrypt_salt_rounds),
	);

	const otpKey = `passenger-registraton-otp:${email}`;
	const otpValue = crypto.randomInt(100000, 1000000).toString();
	const expirationSeconds = 60 * 2;

	await radisClient.set(otpKey, otpValue, {
		expiration: {
			type: "EX",
			value: expirationSeconds,
		},
	});

	const passengerRegistrationKey = `passenger-registration-data:${email}`;

	const passengerData = {
		name,
		email,
		password: hashedPassword,
	};

	await radisClient.set(
		passengerRegistrationKey,
		JSON.stringify(passengerData),
		{
			expiration: {
				type: "EX",
				value: expirationSeconds,
			},
		},
	);

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/registration-otp.ejs",
	);

	const templateData = {
		name,
		otp: otpValue,
		expirationMinutes: expirationSeconds / 60,
	};

	const html = await ejs.renderFile(templatePath, templateData);

	await transporter.sendMail({
		from: config.email_sender,
		to: email,
		subject: "Verify Your Account - Bus Sheba System",
		html,
	});
};

const verifyPassenger = async (payload: IVerifyPassengerPayload) => {
	const otp = payload.otp;

	const email = payload.email.trim().toLowerCase();

	const isUserExist = await prisma.user.findUnique({
		where: { email },
	});

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
		throw new AppError(httpStatus.CONFLICT, "Your Email already verified");
	}

	const otpKey = `passenger-registraton-otp:${email}`;

	const redisOtp = await radisClient.get(otpKey);

	if (!redisOtp) {
		throw new AppError(httpStatus.BAD_REQUEST, "Invalid OTP");
	}

	if (redisOtp !== otp) {
		throw new AppError(httpStatus.BAD_REQUEST, "OTP does not match");
	}

	await radisClient.del(otpKey);

	const passengerRegistrationKey = `passenger-registration-data:${email}`;

	const redisPassengerData = await radisClient.get(passengerRegistrationKey);

	if (!redisPassengerData) {
		throw new AppError(httpStatus.BAD_REQUEST, "Passenger does not exists");
	}

	const passengerPayload: IRegisterPassengerPayload =
		JSON.parse(redisPassengerData);

	const createdUser = await prisma.user.create({
		data: {
			name: passengerPayload.name,
			email: passengerPayload.email,
			password: passengerPayload.password,
			role: Role.PASSENGER,
			status: UserStatus.ACTIVE,
			emailVerified: true,
			emailVerifiedAt: new Date(),
		},
		omit: { password: true },
	});

	await radisClient.del(passengerRegistrationKey);

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/passenger-welcome-email.ejs",
	);

	const templateData = {
		name: createdUser.name,
	};

	const html = await ejs.renderFile(templatePath, templateData);

	await transporter.sendMail({
		from: config.email_sender,
		to: email,
		subject: "Welcome to Bus Sheba System",
		html,
	});

	const jwtPayload = {
		id: createdUser.id,
		name: createdUser.name,
		email: createdUser.email,
		role: createdUser.role,
	};

	const { accessToken, refreshToken } = signToken(jwtPayload);

	return {
		user: createdUser,
		accessToken,
		refreshToken,
	};
};

const loginUser = async (payload: ILoginUserPayload) => {
	const { password } = payload;
	const email = payload.email.trim().toLowerCase();

	const user = await prisma.user.findUnique({
		where: { email },
		include: { operator: true },
	});

	if (!user) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	if (user.status === UserStatus.BLOCKED) {
		throw new AppError(httpStatus.FORBIDDEN, "User is blocked");
	}

	if (user.isDeleted || user.status === UserStatus.DELETED) {
		throw new AppError(httpStatus.NOT_FOUND, "User is deleted");
	}
	if (user.needPasswordChange) {
		throw new AppError(httpStatus.BAD_REQUEST, "Password change is required");
	}

	if (user.password === null && user.googleId !== null) {
		throw new AppError(
			httpStatus.CONFLICT,
			"User already registered with google account.Please try to login in with google",
		);
	}

	if (!user.emailVerified) {
		throw new AppError(httpStatus.FORBIDDEN, "Email is not verified");
	}

	// for operator, check if the account is approved
	if (
		user.role === Role.OPERATOR &&
		user.operator?.verificationStatus !== "APPROVED"
	) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Operator account is not approved yet. Please wait for approval.",
		);
	}

	const isPasswordMatched = await bcrypt.compare(
		password,
		user.password as string,
	);

	if (!isPasswordMatched) {
		throw new AppError(httpStatus.UNAUTHORIZED, "Invalid credentials");
	}

	const jwtPayload = {
		id: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const { accessToken, refreshToken } = signToken(jwtPayload);

	return {
		accessToken,
		refreshToken,
	};
};

const getMe = async (user: RequestUser) => {
	const isUserExists = await prisma.user.findUnique({
		where: {
			id: user.id,
		},
		omit: {
			password: true,
		},
	});

	if (!isUserExists) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	return isUserExists;
};

const refreshToken = async (token: string) => {
	const verifiedRefreshToken = verifyToken(token, "refresh");

	if (!verifiedRefreshToken.success || !verifiedRefreshToken.data) {
		throw new AppError(
			httpStatus.UNAUTHORIZED,
			config.node_env === "development"
				? verifiedRefreshToken.error
				: "Invalid refresh token",
		);
	}

	const data = verifiedRefreshToken.data as JwtPayload;

	const user = await prisma.user.findUnique({
		where: { id: data.id },
	});

	if (!user || user.isDeleted || user.status !== UserStatus.ACTIVE) {
		throw new Error("User is inactive or not found");
	}

	const jwtPayload = {
		id: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const { accessToken, refreshToken } = signToken(jwtPayload);

	return {
		accessToken,
		refreshToken,
	};
};

const googleLogin = async (payload: IGoogleLoginPayload) => {
	let googleIdTokenPayload: TokenPayload | null | undefined = null;
	try {
		const ticket = await googleClient.verifyIdToken({
			idToken: payload.idToken,
			audience: config.google_client_id,
		});

		googleIdTokenPayload = ticket.getPayload();
	} catch (error) {
		console.log("Google id token verification failed", error);
		throw new AppError(
			httpStatus.UNAUTHORIZED,
			"Invalid or Expired Google id token",
		);
	}

	if (!googleIdTokenPayload) {
		throw new AppError(
			httpStatus.UNAUTHORIZED,
			"Invalid or Expired Google id token",
		);
	}

	if (!googleIdTokenPayload.email) {
		throw new AppError(httpStatus.UNAUTHORIZED, "Google email not found");
	}
	if (!googleIdTokenPayload.name) {
		throw new AppError(httpStatus.UNAUTHORIZED, "Google user name not found");
	}

	const isPassengerExistWithGoogle = await prisma.user.findUnique({
		where: {
			email: googleIdTokenPayload.email,
			role: "PASSENGER",
			googleId: googleIdTokenPayload.sub,
		},
	});

	let user = isPassengerExistWithGoogle;

	if (!isPassengerExistWithGoogle) {
		const passengerExistWithCreadential = await prisma.user.findUnique({
			where: {
				email: googleIdTokenPayload.email,
				role: "PASSENGER",
				authProvider: "CREDENTIAL",
			},
		});

		if (passengerExistWithCreadential) {
			if (!passengerExistWithCreadential.emailVerified) {
				throw new AppError(httpStatus.BAD_REQUEST, "Email is not Verified");
			}

			if (passengerExistWithCreadential.status === "BLOCKED") {
				throw new AppError(httpStatus.BAD_REQUEST, "Email is not Verified");
			}

			if (
				passengerExistWithCreadential.isDeleted ||
				passengerExistWithCreadential.status === "DELETED"
			) {
				throw new AppError(httpStatus.NOT_FOUND, "User is deleted");
			}

			user = await prisma.user.update({
				where: {
					id: passengerExistWithCreadential.id,
				},
				data: {
					googleId: googleIdTokenPayload.sub,
				},
			});
		} else {
			// create user
			user = await prisma.user.create({
				data: {
					name: googleIdTokenPayload.name,
					email: googleIdTokenPayload.email,
					emailVerified: true,
					authProvider: "GOOGLE",
					emailVerifiedAt: new Date(),
					role: "PASSENGER",
				},
			});

			const templatePath = path.join(
				process.cwd(),
				"src/app/templates/passenger-welcome-email.ejs",
			);

			const templateData = {
				name: user.name,
			};

			const html = await ejs.renderFile(templatePath, templateData);

			await transporter.sendMail({
				from: config.email_sender,
				to: user.email,
				subject: "Welcome to Bus Sheba System",
				html,
			});
		}
	}

	if (!user) {
		throw new AppError(httpStatus.NOT_FOUND, "User is not found");
	}

	if (user.status === "BLOCKED") {
		throw new AppError(httpStatus.FORBIDDEN, "User is blocked");
	}

	if (user.isDeleted || user.status === "DELETED") {
		throw new AppError(httpStatus.NOT_FOUND, "User is deleted");
	}

	const jwtPayload = {
		id: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const { accessToken, refreshToken } = signToken(jwtPayload);

	return {
		user: user,
		accessToken,
		refreshToken,
	};
};

const forgetPassword = async (payload: IForgetPasswordPayload) => {
	const { email } = payload;
	const isUserExist = await prisma.user.findUnique({
		where: { email },
	});

	if (!isUserExist) {
		throw new AppError(httpStatus.NOT_FOUND, "User does not exists");
	}

	if (isUserExist.status === "BLOCKED") {
		throw new AppError(httpStatus.FORBIDDEN, "User is blocked");
	}

	if (!isUserExist.emailVerified) {
		throw new AppError(httpStatus.BAD_REQUEST, "User is not verified");
	}

	if (isUserExist.isDeleted || isUserExist.status === "DELETED") {
		throw new AppError(httpStatus.NOT_FOUND, "User is deleted");
	}

	if (isUserExist.authProvider !== "CREDENTIAL") {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"User is registered with google login. Please try to login with google",
		);
	}

	const otp = crypto.randomInt(100000, 1000000).toString();
	const key = `forget-password-otp:${isUserExist.email}`;
	const expirationSeconds = 120;

	await radisClient.set(key, otp, {
		expiration: {
			type: "EX",
			value: expirationSeconds,
		},
	});

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/forget-password.ejs",
	);

	const templateData = {
		name: isUserExist.name,
		otp,
		expirationMinutes: expirationSeconds / 60,
	};

	const html = await ejs.renderFile(templatePath, templateData);

	await transporter.sendMail({
		from: config.email_sender,
		to: isUserExist.email,
		subject: "Forget Password",
		html,
	});
};

const resetPassword = async (payload: IResetPasswordPayload) => {
	const { email, newPassword, otp } = payload;
	const isUserExist = await prisma.user.findUnique({
		where: { email },
	});

	if (!isUserExist) {
		throw new AppError(httpStatus.NOT_FOUND, "User does not exists");
	}

	if (isUserExist.status === "BLOCKED") {
		throw new AppError(httpStatus.FORBIDDEN, "User is blocked");
	}

	if (!isUserExist.emailVerified) {
		throw new AppError(httpStatus.BAD_REQUEST, "User is not verified");
	}

	if (isUserExist.isDeleted || isUserExist.status === "DELETED") {
		throw new AppError(httpStatus.NOT_FOUND, "User is deleted");
	}

	if (isUserExist.authProvider !== "CREDENTIAL") {
		throw new AppError(httpStatus.BAD_REQUEST, "User has account with google");
	}

	const key = `forget-password-otp:${isUserExist.email}`;

	const redisOtp = await radisClient.get(key);

	if (!redisOtp) {
		throw new AppError(httpStatus.BAD_REQUEST, "Invalid OTP");
	}

	if (redisOtp !== otp) {
		throw new AppError(httpStatus.BAD_REQUEST, "OTP does not match");
	}

	const hasedNewPassword = await bcrypt.hash(
		newPassword,
		Number(config.bcrypt_salt_rounds),
	);

	await prisma.user.update({
		where: {
			email: isUserExist.email,
		},
		data: {
			password: hasedNewPassword,
		},
	});

	await radisClient.del([key]);

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/reset-password.ejs",
	);

	const templateData = {
		name: isUserExist.name,
	};

	const html = await ejs.renderFile(templatePath, templateData);

	await transporter.sendMail({
		from: config.email_sender,
		to: isUserExist.email,
		subject: "Password Reset Successful",
		html,
	});
};

const changePassword = async (
	payload: IChangePasswordPayload,
	user: RequestUser,
) => {
	const { email, newPassword, oldPassword } = payload;

	const isUserExist = await prisma.user.findUnique({
		where: { id: user.id, email },
	});

	if (!isUserExist) {
		throw new AppError(httpStatus.NOT_FOUND, "User does not exists");
	}

	if (isUserExist.status === "BLOCKED") {
		throw new AppError(httpStatus.FORBIDDEN, "User is blocked");
	}

	if (!isUserExist.emailVerified) {
		throw new AppError(httpStatus.BAD_REQUEST, "User is not verified");
	}

	if (isUserExist.isDeleted || isUserExist.status === "DELETED") {
		throw new AppError(httpStatus.NOT_FOUND, "User is deleted");
	}

	if (isUserExist.authProvider !== "CREDENTIAL") {
		throw new AppError(httpStatus.BAD_REQUEST, "User has account with google");
	}

	const isPasswordMatched = await bcrypt.compare(
		oldPassword,
		isUserExist.password as string,
	);

	if (!isPasswordMatched) {
		throw new Error("Invalid credentials");
	}

	const hasedNewPassword = await bcrypt.hash(
		newPassword,
		Number(config.bcrypt_salt_rounds),
	);

	await prisma.user.update({
		where: {
			email: isUserExist.email,
		},
		data: {
			password: hasedNewPassword,
		},
	});

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/change-password.ejs",
	);

	const templateData = {
		changeTime: new Date().toLocaleString(),
		date: new Date().toDateString(),
		name: isUserExist.name,
	};

	const html = await ejs.renderFile(templatePath, templateData);

	await transporter.sendMail({
		from: config.email_sender,
		to: isUserExist.email,
		subject: "Password Reset Successful",
		html,
	});
};

const updateProfile = async (
	payload: IUpdateProfilePayload,
	image: IImageFile | undefined,
	user: RequestUser,
) => {
	const currentUser = await prisma.user.findUnique({
		where: {
			id: user.id,
		},
	});

	if (!currentUser) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	let cloudinaryResult: UploadApiResponse | undefined;

	if (image) {
		cloudinaryResult = await new Promise<UploadApiResponse>(
			(reslove, reject) => {
				cloudinary.uploader
					.upload_stream({ resource_type: "auto" }, async (error, result) => {
						if (error) {
							console.log(error);
							throw new AppError(
								httpStatus.INTERNAL_SERVER_ERROR,
								error.message,
							);
						}

						if (!result) {
							return reject(
								new AppError(
									httpStatus.INTERNAL_SERVER_ERROR,
									"No result return from cloudinary",
								),
							);
						}

						reslove(result);
					})
					.end(image?.buffer);
			},
		);
	}

	const updatedUser = await prisma.user.update({
		where: {
			id: user.id,
		},
		data: {
			image: cloudinaryResult?.secure_url
				? cloudinaryResult.secure_url
				: currentUser.image
					? currentUser.image
					: null,

			imagePublicId: cloudinaryResult?.public_id
				? cloudinaryResult.public_id
				: currentUser.imagePublicId
					? currentUser.imagePublicId
					: null,

			name: payload?.name ?? currentUser.name,

			phone: payload?.phone ?? currentUser.phone,
		},
		omit: {
			password: true,
		},
	});

	if (user.role === "OPERATOR") {
		await prisma.operator.update({
			where: {
				email: currentUser.email,
			},
			data: {
				name: payload?.name ?? currentUser.name,
				phone: payload?.phone ?? currentUser.phone,
			},
		});
	}

	if (currentUser?.imagePublicId) {
		await cloudinary.uploader.destroy(currentUser.imagePublicId);
	}

	return updatedUser;
};

export const AuthService = {
	registerPassenger,
	verifyPassenger,
	loginUser,
	getMe,
	refreshToken,
	googleLogin,
	forgetPassword,
	resetPassword,
	changePassword,
	updateProfile,
};
