import jwt, { SignOptions } from "jsonwebtoken";
import config from "../config";
import { JwtPayload } from "../types/types";
export const signToken = (payload: JwtPayload) => {
	const accessToken = jwt.sign(payload, config.jwt_access_secret, {
		expiresIn: config.jwt_access_expires_in,
	} as SignOptions);

	const refreshToken = jwt.sign(payload, config.jwt_refresh_secret, {
		expiresIn: config.jwt_refresh_expires_in,
	} as SignOptions);

	return { accessToken, refreshToken };
};

export const verifyToken = (token: string, type: "access" | "refresh") => {
	try {
		const secret =
			type === "access" ? config.jwt_access_secret : config.jwt_refresh_secret;

		const decoded = jwt.verify(token, secret);
		return {
			success: true,
			data: decoded as JwtPayload,
		};
	} catch (error: any) {
		console.log("Token verification Failed");
		return {
			success: false,
			error: error.message,
		};
	}
};
