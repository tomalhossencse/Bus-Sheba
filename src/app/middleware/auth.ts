import { catchAsync } from "../utils/catchAsync";
import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import httpStatus from "http-status";
import { prisma } from "../lib/prisma";
import { Role } from "../../generated/prisma/enums";
import { AppError } from "../utils/appError";

export const auth = (...roles: Role[]) => {
	return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
		const accessToken = req.cookies.accessToken
			? req.cookies.accessToken
			: req.headers.authorization?.startsWith("Bearer ")
				? req.headers.authorization?.split(" ")[1]
				: req.headers.authorization;

		if (!accessToken) {
			throw new AppError(
				httpStatus.UNAUTHORIZED,
				"You are not logged in. Please log in to access this resource.",
			);
		}

		const verifiedToken = verifyToken(accessToken, "access");

		if (!verifiedToken.success) {
			throw new AppError(httpStatus.UNAUTHORIZED, verifiedToken.error);
		}

		const user = await prisma.user.findUnique({
			where: {
				id: verifiedToken.data?.userId,
			},
		});

		if (!user) {
			throw new AppError(
				httpStatus.NOT_FOUND,
				"User not found. Please log in again.",
			);
		}

		if (user.status === "BLOCKED") {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"Your account has been blocked. Please contact support.",
			);
		}

		const { id, name, email, role } = user;

		req.user = { id, name, email, role };

		if (roles.length && !roles.includes(req.user.role)) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"Forbidden. You don't have permission to access this resource.",
			);
		}

		next();
	});
};
