import config from "../config";
import httpStatus from "http-status";
import { AppError } from "../utils/AppError";
import { radisClient } from "./redis";

type RefundBkashPaymentPayload = {
	paymentID: string;
	trxID: string;
	amount: string | number;
};

export const refundBkashPayment = async (
	payment: RefundBkashPaymentPayload,
) => {
	try {
		const bkashIdToken = await getBkashIdToken();

		if (!bkashIdToken) {
			throw new AppError(
				httpStatus.BAD_GATEWAY,
				"Bkash access token not found",
			);
		}

		const bkashRefundPaymentRes = await fetch(
			`${config.bkash_base_url}/tokenized/checkout/payment/refund`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
					authorization: bkashIdToken,
					"x-app-key": config.bkash_app_key,
				},
				body: JSON.stringify({
					paymentID: payment.paymentID,
					trxID: payment.trxID,
					amount: payment.amount?.toString(),
					sku: "Bus Ticket Cancellation",
					reason: "Trip cancelled by operator",
				}),
			},
		);

		if (!bkashRefundPaymentRes.ok) {
			throw new AppError(httpStatus.BAD_GATEWAY, "bKash Refund request failed");
		}

		const bkashRefundResult = await bkashRefundPaymentRes.json();

		if (bkashRefundResult.statusCode !== "0000") {
			throw new AppError(
				httpStatus.BAD_GATEWAY,
				bkashRefundResult.statusMessage || "bKash Refund failed",
			);
		}

		return bkashRefundResult;
	} catch (error: any) {
		if (error instanceof AppError) {
			throw error;
		}

		throw new AppError(
			httpStatus.INTERNAL_SERVER_ERROR,
			error.message || "bKash Refund failed",
		);
	}
};

export const getBkashIdToken = async () => {
	try {
		const idTokenKey = "bkash:IdToken";
		const refreshTokenKey = "bkash:refreshToken";

		let bkashIdToken = await radisClient.get(idTokenKey);
		const bkashIdTokenTtl = await radisClient.ttl(idTokenKey);

		const bkashRefreshToken = await radisClient.get(refreshTokenKey);
		const bkashRefreshTokenTtl = await radisClient.ttl(refreshTokenKey);

		if (
			(bkashIdTokenTtl <= 600 || !bkashIdToken) &&
			bkashRefreshToken &&
			bkashRefreshTokenTtl >= 600
		) {
			const refreshTokenRes = await fetch(
				`${config.bkash_base_url}/tokenized/checkout/token/refresh`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
						username: config.bkash_username,
						password: config.bkash_password,
					},
					body: JSON.stringify({
						app_key: config.bkash_app_key,
						app_secret: config.bkash_app_secret,
						refresh_token: bkashRefreshToken,
					}),
				},
			);

			if (!refreshTokenRes.ok) {
				throw new AppError(
					httpStatus.BAD_GATEWAY,
					"Bkash Refresh Token failed",
				);
			}

			const refreshTokenResult = await refreshTokenRes.json();

			bkashIdToken = refreshTokenResult.id_token as string;

			await radisClient.set(idTokenKey, bkashIdToken, {
				expiration: {
					type: "EX",
					value: 60 * 60,
				},
			});

			return bkashIdToken;
		}

		if (bkashIdToken && bkashIdTokenTtl > 600) {
			return bkashIdToken;
		}

		const res = await fetch(
			`${config.bkash_base_url}/tokenized/checkout/token/grant`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
					username: config.bkash_username,
					password: config.bkash_password,
				},
				body: JSON.stringify({
					app_key: config.bkash_app_key,
					app_secret: config.bkash_app_secret,
				}),
			},
		);

		if (!res.ok) {
			throw new AppError(
				httpStatus.BAD_GATEWAY,
				"Bkash access Token grant failed",
			);
		}

		const result = await res.json();
		await radisClient.set(idTokenKey, result.id_token, {
			expiration: {
				type: "EX",
				value: 60 * 60,
			},
		});

		await radisClient.set(refreshTokenKey, result.refresh_token, {
			expiration: {
				type: "EX",
				value: 60 * 60 * 24 * 28,
			},
		});

		bkashIdToken = result.id_token;

		return bkashIdToken;
	} catch (error: any) {
		throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, error.message);
	}
};
