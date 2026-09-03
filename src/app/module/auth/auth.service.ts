import bcrypt from "bcryptjs";
import { JwtPayload } from "jsonwebtoken";
import config from "../../config";
import { prisma } from "../../lib/prisma";
import {
	ILoginUserPayload,
	IRegisterPassengerPayload,
	IRequestUser,
} from "./auth.interface";
import { Role, UserStatus } from "../../../generated/prisma/enums";
import { signToken, verifyToken } from "../../utils/jwt";
import { AppError } from "../../utils/appError";
import httpStatus from "http-status";
const registerPassenger = async (payload: IRegisterPassengerPayload) => {
	const { name, password } = payload;
	const email = payload.email.trim().toLowerCase();

	const isUserExists = await prisma.user.findUnique({
		where: { email },
	});

	if (isUserExists) {
		throw new Error("User with this email already exists");
	}

	const hashedPassword = await bcrypt.hash(
		password,
		Number(config.bcrypt_salt_rounds),
	);

	const createdUser = await prisma.user.create({
		data: {
			name,
			email,
			password: hashedPassword,
			role: Role.PASSENGER,
			status: UserStatus.ACTIVE,
			emailVerified: false,
			patient: {
				create: { name, email },
			},
		},
		omit: { password: true },
	});

	const { ...user } = createdUser;
	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const { accessToken, refreshToken } = signToken(jwtPayload);

	return {
		user,
		accessToken,
		refreshToken,
	};
};

const loginUser = async (payload: ILoginUserPayload) => {
	const { password } = payload;
	const email = payload.email.trim().toLowerCase();

	const user = await prisma.user.findUnique({
		where: { email },
	});

	if (!user) {
		// throw new Error("User not found");
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

	if (user.password === null && user.googlId !== null) {
		throw new AppError(
			httpStatus.CONFLICT,
			"User already registered with google account.Please try to login in with google",
		);
	}

	const isPasswordMatched = await bcrypt.compare(
		password,
		user.password as string,
	);

	if (!isPasswordMatched) {
		throw new Error("Invalid credentials");
	}

	const jwtPayload = {
		userId: user.id,
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

const getMe = async (user: IRequestUser) => {
	const isUserExists = await prisma.user.findUnique({
		where: {
			id: user.userId,
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
		where: { id: data.userId },
	});

	if (!user || user.isDeleted || user.status !== UserStatus.ACTIVE) {
		throw new Error("User is inactive or not found");
	}

	const jwtPayload = {
		userId: user.id,
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

export const AuthService = {
	registerPassenger,
	loginUser,
	getMe,
	refreshToken,
};
