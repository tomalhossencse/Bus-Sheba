import cron from "node-cron";
import { prisma } from "./prisma";
import { refundBkashPayment } from "./bkash";

const MAX_REFUND_ATTEMPTS = 5;

export const updateTripSeats = async () => {
	cron.schedule("*/5 * * * *", async () => {
		try {
			const currentTime = new Date();

			const expiredBookings = await prisma.booking.findMany({
				where: {
					status: "PENDING",
					expiresAt: {
						lte: currentTime,
					},
				},
				select: { id: true },
			});

			if (expiredBookings.length === 0) return;

			const expiredBookingIds = expiredBookings.map((booking) => booking.id);
			console.log(
				`[CRON] Info: Found ${expiredBookingIds.length} expired booking(s) to release.`,
			);

			await prisma.$transaction(async (tx) => {
				const updatedTripSeats = await tx.tripSeat.updateMany({
					where: {
						status: "HELD",
						bookingSeat: {
							bookingId: { in: expiredBookingIds },
						},
					},
					data: {
						status: "AVAILABLE",
					},
				});

				await tx.bookingSeat.deleteMany({
					where: { bookingId: { in: expiredBookingIds } },
				});

				await tx.booking.updateMany({
					where: { id: { in: expiredBookingIds } },
					data: { status: "EXPIRED", cancelledAt: new Date() },
				});

				if (updatedTripSeats.count > 0) {
					console.log(`Cron : Updated ${updatedTripSeats.count} trip seats`);
				}
			});

			console.log(
				`[CRON] Success: Expired ${expiredBookingIds.length} expired bookings and released seats.`,
			);
		} catch (error) {
			console.error("[CRON] Error: Failed to release expired bookings", error);
		}

		console.log(
			"[CRON] Info: Running update trip seats and booking task every 5 minutes",
		);
	});
};

export const processRefunds = async () => {
	cron.schedule("*/10 * * * *", async () => {
		try {
			const pendingRefunds = await prisma.payment.findMany({
				where: {
					status: "REFUND_PENDING",
				},
			});

			if (pendingRefunds.length > 0) {
				console.log(
					`[CRON] Info: Found ${pendingRefunds.length} payment(s) pending refund.`,
				);

				for (const payment of pendingRefunds) {
					try {
						if (!payment.paymentID || !payment.trxID) {
							await prisma.payment.update({
								where: { id: payment.id },
								data: {
									status: "FAILED",
									gatewayResponse: {
										...(payment.gatewayResponse as object),
										refundError:
											"Missing paymentID or trxID. Cannot process refund.",
									},
								},
							});
							console.error(
								`[CRON] Error: Payment ${payment.id} missing refund details.`,
							);
							continue;
						}

						const bkashRefundResult = await refundBkashPayment({
							paymentID: payment.paymentID,
							trxID: payment.trxID,
							amount: payment.amount?.toString(),
						});

						await prisma.payment.update({
							where: { id: payment.id },
							data: {
								status: "REFUNDED",
								refundTrxId: bkashRefundResult.refundTrxId,
								refundAmount: payment.amount,
								refundReason:
									payment.refundReason ?? "Refund processed by cron",
								refundedAt: new Date().toISOString(),
								gatewayResponse: {
									...(payment.gatewayResponse as object),
									refundResponse: bkashRefundResult,
									refundAttempts:
										(
											payment.gatewayResponse as {
												refundAttempts?: number;
											} | null
										)?.refundAttempts ?? 0,
								},
							},
						});

						console.log(
							`[CRON] Success: Refunded payment ${payment.id} (${bkashRefundResult.refundTrxId}).`,
						);
					} catch (error: any) {
						const gateway =
							(payment.gatewayResponse as {
								refundAttempts?: number;
							} | null) ?? {};
						const attempts = (gateway.refundAttempts ?? 0) + 1;

						if (attempts >= MAX_REFUND_ATTEMPTS) {
							await prisma.payment.update({
								where: { id: payment.id },
								data: {
									status: "FAILED",
									gatewayResponse: {
										...(payment.gatewayResponse as object),
										refundAttempts: attempts,
										lastRefundError: error.message,
									},
								},
							});
							console.error(
								`[CRON] Error: Refund failed permanently for payment ${payment.id} after ${attempts} attempts.`,
							);
						} else {
							await prisma.payment.update({
								where: { id: payment.id },
								data: {
									gatewayResponse: {
										...(payment.gatewayResponse as object),
										refundAttempts: attempts,
										lastRefundError: error.message,
									},
								},
							});
							console.warn(
								`[CRON] Warn: Refund attempt ${attempts} failed for payment ${payment.id}. Will retry.`,
							);
						}
					}
				}
			}
			console.log("[CRON] Info: Refund processing cycle completed.");
		} catch (error) {
			console.error("[CRON] Error: Failed to process refunds", error);
		}
	});
};
